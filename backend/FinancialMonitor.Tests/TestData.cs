using FinancialMonitor.Api;

namespace FinancialMonitor.Tests;

internal static class TestData
{
    public static readonly DateTimeOffset BaseTime = new(2024, 1, 15, 10, 0, 0, TimeSpan.Zero);

    public static Transaction Tx(
        Guid? id = null,
        TransactionStatus status = TransactionStatus.Pending,
        int secondsLater = 0) => new()
        {
            TransactionId = id ?? Guid.NewGuid(),
            Amount = 1500.50m,
            Currency = "USD",
            Status = status,
            Timestamp = BaseTime.AddSeconds(secondsLater),
        };
}
