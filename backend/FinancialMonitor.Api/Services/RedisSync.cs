using FinancialMonitor.Api.Models;
using System.Text.Json;
using StackExchange.Redis;

namespace FinancialMonitor.Api.Services;

/// <summary>
/// Keeps every instance's store and clients in step over Redis Pub/Sub.
/// Does nothing when no Redis address is configured, so a single instance needs no Redis.
/// </summary>
internal sealed class RedisSync(
    IConfiguration configuration,
    TransactionProcessor processor,
    ILogger<RedisSync> logger) : IHostedService
{
    private static readonly RedisChannel Channel = RedisChannel.Literal("transactions");
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private ConnectionMultiplexer? _redis;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var address = configuration.GetConnectionString("Redis");
        if (string.IsNullOrEmpty(address)) return;

        var options = ConfigurationOptions.Parse(address);
        // Keep retrying in the background, so a pod can start before Redis does.
        options.AbortOnConnectFail = false;
        // Fail immediately while disconnected, so a POST never waits on Redis.
        options.BacklogPolicy = BacklogPolicy.FailFast;

        _redis = await ConnectionMultiplexer.ConnectAsync(options);
        // FireAndForget doesn't throw while Redis is down. The library subscribes once it connects.
        await _redis.GetSubscriber().SubscribeAsync(Channel, OnMessage, CommandFlags.FireAndForget);
    }

    public async Task PublishAsync(Transaction transaction)
    {
        if (_redis is null) return;

        try
        {
            await _redis.GetSubscriber().PublishAsync(Channel, JsonSerializer.Serialize(transaction, Json));
        }
        catch (Exception e) when (e is RedisException or TimeoutException)
        {
            // shortcut: other instances never get this transaction, use Redis Streams or Kafka if they must catch up.
            logger.LogError(e, "Could not publish transaction {TransactionId}", transaction.TransactionId);
        }
    }

    // The sender hears its own message too. That is a no-op, because the store sees nothing newer.
    // async void because Redis takes an Action, so every failure has to be caught here.
    private async void OnMessage(RedisChannel channel, RedisValue message)
    {
        try
        {
            await processor.ApplyAsync(JsonSerializer.Deserialize<Transaction>(message.ToString(), Json)!);
        }
        catch (Exception e)
        {
            logger.LogError(e, "Could not apply a transaction received from Redis");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        // Not DisposeAsync: in StackExchange.Redis 3.4.31 it throws NullReferenceException on a live connection.
        _redis?.Dispose();
        return Task.CompletedTask;
    }
}
