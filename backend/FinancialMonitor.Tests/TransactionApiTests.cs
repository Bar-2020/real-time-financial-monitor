using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FinancialMonitor.Api.Models;
using FinancialMonitor.Api.Services;
using FinancialMonitor.Api.Hubs;
using FinancialMonitor.Api;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace FinancialMonitor.Tests;

public sealed class TransactionApiTests : IDisposable
{
    private const string Url = "/api/transactions";

    // Pending posts here must stay Pending, so push the resolution out of the tests' reach.
    private readonly WebApplicationFactory<Program> _app = new WebApplicationFactory<Program>().WithWebHostBuilder(host =>
    {
        host.UseSetting("PendingResolution:MinDelayMs", "3600000");
        host.UseSetting("PendingResolution:MaxDelayMs", "3600000");
    });
    private readonly HttpClient _http;

    public TransactionApiTests() => _http = _app.CreateClient();

    public void Dispose()
    {
        _http.Dispose();
        _app.Dispose();
    }

    private TestServer Server => _app.Server;

    [Fact]
    public async Task A_valid_post_is_accepted_and_broadcast()
    {
        await using var client = await TestClient.ConnectAsync(Server);
        var transaction = TestData.Tx();

        var response = await _http.PostAsJsonAsync(Url, transaction);
        await client.WaitForAsync(1);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal(transaction, Assert.Single(client.Received));
    }

    [Theory]
    [InlineData("""{"amount":1.5,"currency":"USD","status":"Pending","timestamp":"2024-01-15T10:00:00Z"}""")]
    [InlineData("""{"transactionId":"3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b","currency":"USD","status":"Pending","timestamp":"2024-01-15T10:00:00Z"}""")]
    [InlineData("""{"transactionId":"3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b","amount":1.5,"status":"Pending","timestamp":"2024-01-15T10:00:00Z"}""")]
    [InlineData("""{"transactionId":"3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b","amount":1.5,"currency":null,"status":"Pending","timestamp":"2024-01-15T10:00:00Z"}""")]
    [InlineData("""{"transactionId":"3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b","amount":1.5,"currency":"USD","timestamp":"2024-01-15T10:00:00Z"}""")]
    [InlineData("""{"transactionId":"3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b","amount":1.5,"currency":"USD","status":"Pending"}""")]
    [InlineData("""{"transactionId":"3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b","amount":1.5,"currency":"USD","status":"Done","timestamp":"2024-01-15T10:00:00Z"}""")]
    [InlineData("""{"transactionId":"3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b","amount":1.5,"currency":"USD","status":1,"timestamp":"2024-01-15T10:00:00Z"}""")]
    [InlineData("""{"transactionId":"3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b","amount":1.5,"currency":"USD","status":"Pending,Completed","timestamp":"2024-01-15T10:00:00Z"}""")]
    [InlineData("""{"transactionId":"not-a-guid","amount":1.5,"currency":"USD","status":"Pending","timestamp":"2024-01-15T10:00:00Z"}""")]
    [InlineData("""{ not json""")]
    public async Task An_invalid_body_is_rejected_and_not_stored(string body)
    {
        var response = await _http.PostAsync(Url, new StringContent(body, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await using var client = await TestClient.ConnectAsync(Server);
        Assert.Empty(await client.Snapshot);
    }

    [Fact]
    public async Task A_rejected_post_names_the_invalid_field()
    {
        var response = await _http.PostAsJsonAsync(Url, TestData.Tx() with { Amount = 0 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(problem.GetProperty("errors").TryGetProperty("amount", out _));
    }

    [Fact]
    public async Task A_new_client_gets_the_latest_transactions_newest_first()
    {
        var older = TestData.Tx(secondsLater: 1);
        var newer = TestData.Tx(secondsLater: 2);
        await _http.PostAsJsonAsync(Url, older);
        await _http.PostAsJsonAsync(Url, newer);

        await using var client = await TestClient.ConnectAsync(Server);

        Assert.Equal([newer, older], await client.Snapshot);
    }

    [Fact]
    public async Task The_snapshot_is_limited_to_the_snapshot_size()
    {
        var store = _app.Services.GetRequiredService<TransactionStore>();
        for (var i = 0; i <= TransactionHub.SnapshotSize; i++)
            store.Upsert(TestData.Tx(secondsLater: i));

        await using var client = await TestClient.ConnectAsync(Server);

        var snapshot = await client.Snapshot;
        Assert.Equal(TransactionHub.SnapshotSize, snapshot.Length);
        Assert.Equal(TestData.BaseTime.AddSeconds(TransactionHub.SnapshotSize), snapshot[0].Timestamp);
    }

    [Fact]
    public async Task A_status_change_is_broadcast()
    {
        await using var client = await TestClient.ConnectAsync(Server);
        var id = Guid.NewGuid();

        await _http.PostAsJsonAsync(Url, TestData.Tx(id, TransactionStatus.Pending, secondsLater: 1));
        await _http.PostAsJsonAsync(Url, TestData.Tx(id, TransactionStatus.Failed, secondsLater: 2));
        await client.WaitForAsync(2);

        Assert.Equal(
            [TransactionStatus.Pending, TransactionStatus.Failed],
            client.Received.Select(transaction => transaction.Status));
    }

    [Fact]
    public async Task A_stale_post_is_accepted_but_not_broadcast()
    {
        await using var client = await TestClient.ConnectAsync(Server);
        var id = Guid.NewGuid();
        var current = TestData.Tx(id, TransactionStatus.Completed, secondsLater: 2);
        var sentinel = TestData.Tx();

        await _http.PostAsJsonAsync(Url, current);
        var stale = await _http.PostAsJsonAsync(Url, TestData.Tx(id, TransactionStatus.Pending, secondsLater: 1));
        await _http.PostAsJsonAsync(Url, sentinel);
        await client.WaitForAsync(2);

        Assert.Equal(HttpStatusCode.Accepted, stale.StatusCode);
        Assert.Equal([current, sentinel], client.Received);
    }

    [Fact]
    public async Task Every_client_receives_every_concurrent_post_exactly_once()
    {
        const int clientCount = 20;
        const int postCount = 100;
        var clients = await Task.WhenAll(
            Enumerable.Range(0, clientCount).Select(_ => TestClient.ConnectAsync(Server)));

        await Task.WhenAll(Enumerable.Range(0, postCount)
            .Select(i => _http.PostAsJsonAsync(Url, TestData.Tx(secondsLater: i))));
        // Messages on a connection are ordered, so any duplicate would arrive before this one.
        await _http.PostAsJsonAsync(Url, TestData.Tx(secondsLater: postCount));
        await Task.WhenAll(clients.Select(c => c.WaitForAsync(postCount + 1)));

        Assert.All(clients, client =>
        {
            Assert.Equal(postCount + 1, client.Received.Count);
            Assert.Equal(postCount + 1, client.Received.Select(transaction => transaction.TransactionId).Distinct().Count());
        });

        foreach (var client in clients)
            await client.DisposeAsync();
    }

    [Fact]
    public async Task Health_endpoint_reports_healthy()
    {
        var response = await _http.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
