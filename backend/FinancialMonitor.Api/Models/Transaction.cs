using System.Text.Json.Serialization;
using FinancialMonitor.Api.Json;

namespace FinancialMonitor.Api.Models;

public sealed record Transaction
{
    public Guid TransactionId { get; init; }
    public decimal Amount { get; init; }
    public string Currency { get; init; } = "";
    public TransactionStatus Status { get; init; }

    [JsonConverter(typeof(UtcTimestampConverter))]
    public DateTimeOffset Timestamp { get; init; }
}
