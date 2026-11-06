using System.Text.Json;
using System.Text.Json.Serialization;

namespace FinancialMonitor.Api;

// Values start at 1 so a missing status fails validation. They are powers of two so a
// comma-joined status like "Pending,Completed" parses to an undefined value and fails too.
[JsonConverter(typeof(TransactionStatusConverter))]
public enum TransactionStatus
{
    Pending = 1,
    Completed = 2,
    Failed = 4,
}

public sealed record Transaction
{
    public Guid TransactionId { get; init; }
    public decimal Amount { get; init; }
    public string Currency { get; init; } = "";
    public TransactionStatus Status { get; init; }

    [JsonConverter(typeof(UtcTimestampConverter))]
    public DateTimeOffset Timestamp { get; init; }
}

public sealed class TransactionStatusConverter()
    : JsonStringEnumConverter<TransactionStatus>(allowIntegerValues: false);

public sealed class UtcTimestampConverter : JsonConverter<DateTimeOffset>
{
    public override DateTimeOffset Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.GetDateTimeOffset();

    public override void Write(Utf8JsonWriter writer, DateTimeOffset value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.UtcDateTime);
}
