using FinancialMonitor.Api.Models;

namespace FinancialMonitor.Api.Services;

public sealed class PendingResolver(
    TransactionStore store,
    TransactionProcessor processor,
    RedisSync redisSync,
    IConfiguration configuration,
    IHostApplicationLifetime lifetime,
    ILogger<PendingResolver> logger)
{
    public void Schedule(Guid transactionId)
    {
        var min = configuration.GetValue<int>("PendingResolution:MinDelayMs");
        var max = configuration.GetValue<int>("PendingResolution:MaxDelayMs");
        _ = ResolveAfterAsync(transactionId, TimeSpan.FromMilliseconds(Random.Shared.Next(min, max + 1)));
    }

    public async Task ResolveAsync(Guid transactionId, double randomValue)
    {
        if (!store.TryGet(transactionId, out var storedTransaction) || storedTransaction.Status != TransactionStatus.Pending) return;

        var resolved = storedTransaction with
        {
            Status = randomValue < configuration.GetValue<double>("PendingResolution:FailureRate")
                ? TransactionStatus.Failed
                : TransactionStatus.Completed,
            Timestamp = DateTimeOffset.UtcNow,
        };
        await processor.ApplyAsync(resolved);
        await redisSync.PublishAsync(resolved);
    }

    private async Task ResolveAfterAsync(Guid transactionId, TimeSpan delay)
    {
        try
        {
            await Task.Delay(delay, lifetime.ApplicationStopping);
            await ResolveAsync(transactionId, Random.Shared.NextDouble());
        }
        catch (OperationCanceledException)
        {
            // shortcut: a Pending transaction stays Pending if this instance stops first, use a durable job queue if that matters.
        }
        catch (Exception e)
        {
            logger.LogError(e, "Could not resolve transaction {TransactionId}", transactionId);
        }
    }
}
