using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using FinancialMonitor.Api.Models;
using FinancialMonitor.Api.Services;
using FinancialMonitor.Api;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace FinancialMonitor.Tests;

/// <summary>Needs a real Redis, for example: docker run -p 6379:6379 redis:7-alpine</summary>
public sealed class RedisFactAttribute : FactAttribute
{
    public RedisFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("TEST_REDIS") is null)
            Skip = "Set TEST_REDIS to a Redis address, such as localhost:6379, to run this test.";
    }
}

public sealed class RedisSyncTests
{
    private const string Url = "/api/transactions";

    private static WebApplicationFactory<Program> Instance(string redis) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(host =>
            host.UseSetting("ConnectionStrings:Redis", redis));

    private static WebApplicationFactory<Program> Instance() =>
        Instance(Environment.GetEnvironmentVariable("TEST_REDIS")!);

    private static async Task WaitUntilAsync(Func<bool> condition)
    {
        var deadline = Stopwatch.StartNew();
        while (!condition())
        {
            Assert.True(deadline.Elapsed < TimeSpan.FromSeconds(20), "Timed out waiting for instances to converge.");
            await Task.Delay(20);
        }
    }

    [RedisFact]
    public async Task A_post_to_one_instance_reaches_clients_of_the_other_exactly_once()
    {
        await using var podA = Instance();
        await using var podB = Instance();
        var httpA = podA.CreateClient();
        podB.CreateClient();
        await using var clientA = await TestClient.ConnectAsync(podA.Server);
        await using var clientB = await TestClient.ConnectAsync(podB.Server);
        var first = TestData.Tx();
        var second = TestData.Tx();

        await httpA.PostAsJsonAsync(Url, first);
        await httpA.PostAsJsonAsync(Url, second);
        await clientA.WaitForAsync(2);
        await clientB.WaitForAsync(2);

        // Pod A also hears its own message from Redis. It must not send that one to its clients again.
        await Task.Delay(200);
        Assert.Equal([first, second], clientA.Received);
        Assert.Equal(2, clientB.Received.Count);
        Assert.Contains(first, podB.Services.GetRequiredService<TransactionStore>().GetLatest(10));
    }

    [RedisFact]
    public async Task Instances_agree_on_the_newest_update_whichever_order_they_receive_them()
    {
        await using var podA = Instance();
        await using var podB = Instance();
        var httpA = podA.CreateClient();
        var httpB = podB.CreateClient();
        var id = Guid.NewGuid();
        var newest = TestData.Tx(id, TransactionStatus.Completed, secondsLater: 2);
        var older = TestData.Tx(id, TransactionStatus.Pending, secondsLater: 1);
        bool Holds(WebApplicationFactory<Program> pod) =>
            pod.Services.GetRequiredService<TransactionStore>().GetLatest(10).Contains(newest);

        await Task.WhenAll(httpA.PostAsJsonAsync(Url, newest), httpB.PostAsJsonAsync(Url, older));

        await WaitUntilAsync(() => Holds(podA) && Holds(podB));
    }

    [Fact]
    public async Task A_post_still_succeeds_and_is_stored_when_redis_is_unreachable()
    {
        await using var pod = Instance("localhost:1");
        var http = pod.CreateClient();
        var transaction = TestData.Tx();
        var timer = Stopwatch.StartNew();

        var response = await http.PostAsJsonAsync(Url, transaction);

        Assert.True(timer.Elapsed < TimeSpan.FromSeconds(3), "A POST must not wait on Redis.");
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Contains(transaction, pod.Services.GetRequiredService<TransactionStore>().GetLatest(10));
    }
}
