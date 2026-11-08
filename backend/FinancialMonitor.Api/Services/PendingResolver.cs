using FinancialMonitor.Api.Models;
using FinancialMonitor.Api.Options;
using Microsoft.Extensions.Options;

namespace FinancialMonitor.Api.Services;

internal sealed class PendingResolver(
    TransactionStore store,
    TransactionProcessor processor,
    RedisSync redisSync,
    IOptions<PendingResolutionOptions> options,
    IHostApplicationLifetime lifetime,
    ILogger<PendingResolver> logger)
{
    public void Schedule(Guid transactionId)
    {
        var delayMs = Random.Shared.Next(options.Value.MinDelayMs, options.Value.MaxDelayMs + 1);
        _ = ResolveAfterAsync(transactionId, TimeSpan.FromMilliseconds(delayMs));
    }

    public async Task ResolveAsync(Guid transactionId, double randomValue)
    {
        if (!store.TryGet(transactionId, out var storedTransaction) || storedTransaction.Status != TransactionStatus.Pending) return;

        var resolved = storedTransaction with
        {
            Status = randomValue < options.Value.FailureRate
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
