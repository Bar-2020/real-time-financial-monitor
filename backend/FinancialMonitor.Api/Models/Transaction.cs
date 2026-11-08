using System.Text.Json.Serialization;
using FinancialMonitor.Api.Converters;

namespace FinancialMonitor.Api.Models;

internal sealed record Transaction
{
    public Guid TransactionId { get; init; }
    public decimal Amount { get; init; }
    public required string Currency { get; init; }
    public TransactionStatus Status { get; init; }

    [JsonConverter(typeof(UtcTimestampConverter))]
    public DateTimeOffset Timestamp { get; init; }
}
