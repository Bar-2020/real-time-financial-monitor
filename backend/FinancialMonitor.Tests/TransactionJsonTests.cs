using System.Text.Json;
using FinancialMonitor.Api;

namespace FinancialMonitor.Tests;

public class TransactionJsonTests
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    [Fact]
    public void Serializes_to_the_documented_shape()
    {
        var transaction = new Transaction
        {
            TransactionId = Guid.Parse("3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b"),
            Amount = 1500.50m,
            Currency = "USD",
            Status = TransactionStatus.Completed,
            Timestamp = TestData.BaseTime,
        };

        Assert.Equal(
            """{"transactionId":"3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b","amount":1500.50,"currency":"USD","status":"Completed","timestamp":"2024-01-15T10:00:00Z"}""",
            JsonSerializer.Serialize(transaction, Web));
    }

    [Fact]
    public void A_timestamp_with_an_offset_is_written_back_as_utc()
    {
        var transaction = JsonSerializer.Deserialize<Transaction>("""{"status":"Pending","timestamp":"2024-01-15T12:00:00+02:00"}""", Web)!;

        Assert.Equal(TestData.BaseTime, transaction.Timestamp);
        Assert.Contains("\"2024-01-15T10:00:00Z\"", JsonSerializer.Serialize(transaction, Web));
    }
}
