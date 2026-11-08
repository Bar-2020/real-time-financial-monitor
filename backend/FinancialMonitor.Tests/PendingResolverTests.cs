using System.Net.Http.Json;
using FinancialMonitor.Api;
using FinancialMonitor.Api.Models;
using FinancialMonitor.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace FinancialMonitor.Tests;

public sealed class PendingResolverTests : IDisposable
{
    private readonly WebApplicationFactory<Program> _app = new WebApplicationFactory<Program>().WithWebHostBuilder(host =>
    {
        host.UseSetting("PendingResolution:MinDelayMs", "0");
        host.UseSetting("PendingResolution:MaxDelayMs", "0");
    });

    public void Dispose() => _app.Dispose();

    private TransactionStore Store => _app.Services.GetRequiredService<TransactionStore>();
    private PendingResolver Resolver => _app.Services.GetRequiredService<PendingResolver>();

    [Fact]
    public async Task A_posted_pending_transaction_is_resolved_by_the_backend_and_broadcast()
    {
        await using var client = await TestClient.ConnectAsync(_app.Server);
        var pending = TestData.Tx();

        await _app.CreateClient().PostAsJsonAsync("/api/transactions", pending);
        await client.WaitForAsync(2);

        var resolved = client.Received.Last();
        Assert.Equal(pending, client.Received.First());
        Assert.Equal(pending.TransactionId, resolved.TransactionId);
        Assert.True(resolved.Status is TransactionStatus.Completed or TransactionStatus.Failed);
        Assert.True(resolved.Timestamp > pending.Timestamp);
    }

    [Theory]
    [InlineData(0.5, TransactionStatus.Completed)]
    [InlineData(0.1, TransactionStatus.Failed)]
    public async Task The_random_value_decides_between_completed_and_failed(double randomValue, TransactionStatus expected)
    {
        var pending = TestData.Tx();
        Store.Upsert(pending);

        await Resolver.ResolveAsync(pending.TransactionId, randomValue);

        Assert.True(Store.TryGet(pending.TransactionId, out var stored));
        Assert.Equal(expected, stored.Status);
    }

    [Fact]
    public async Task A_transaction_that_already_has_a_final_status_is_left_alone()
    {
        var completed = TestData.Tx(status: TransactionStatus.Completed);
        Store.Upsert(completed);

        await Resolver.ResolveAsync(completed.TransactionId, randomValue: 0.1);

        Assert.True(Store.TryGet(completed.TransactionId, out var stored));
        Assert.Equal(completed, stored);
    }

    [Fact]
    public async Task An_unknown_transaction_is_ignored()
    {
        await Resolver.ResolveAsync(Guid.NewGuid(), randomValue: 0.5);

        Assert.Empty(Store.GetLatest(10));
    }
}
