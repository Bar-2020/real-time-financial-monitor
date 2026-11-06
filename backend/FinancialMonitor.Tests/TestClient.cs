using System.Collections.Concurrent;
using FinancialMonitor.Api;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;

namespace FinancialMonitor.Tests;

/// <summary>A real SignalR client talking to the in-process server over a WebSocket.</summary>
internal sealed class TestClient : IAsyncDisposable
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(20);

    private readonly HubConnection _connection;
    private readonly TaskCompletionSource<Transaction[]> _snapshot =
        new(TaskCreationOptions.RunContinuationsAsynchronously);

    public ConcurrentQueue<Transaction> Received { get; } = new();

    private TestClient(TestServer server)
    {
        var webSockets = server.CreateWebSocketClient();
        _connection = new HubConnectionBuilder()
            .WithUrl(new Uri(server.BaseAddress, "/hubs/transactions"), options =>
            {
                options.Transports = HttpTransportType.WebSockets;
                options.SkipNegotiation = true;
                options.WebSocketFactory = async (context, cancellationToken) =>
                    await webSockets.ConnectAsync(context.Uri, cancellationToken);
            })
            .Build();

        _connection.On<Transaction[]>("snapshot", rows => _snapshot.TrySetResult(rows));
        _connection.On<Transaction>("transaction", Received.Enqueue);
    }

    public static async Task<TestClient> ConnectAsync(TestServer server)
    {
        var client = new TestClient(server);
        await client._connection.StartAsync();
        await client.Snapshot;
        return client;
    }

    public Task<Transaction[]> Snapshot => _snapshot.Task.WaitAsync(Timeout);

    public async Task WaitForAsync(int count)
    {
        var deadline = DateTime.UtcNow + Timeout;
        while (Received.Count < count)
        {
            Assert.True(DateTime.UtcNow < deadline, $"Received {Received.Count} of {count} messages.");
            await Task.Delay(10);
        }
    }

    public ValueTask DisposeAsync() => _connection.DisposeAsync();
}
