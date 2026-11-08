using System.Text.Json.Serialization;
using FinancialMonitor.Api.Models;

namespace FinancialMonitor.Api.Converters;

public sealed class TransactionStatusConverter()
    : JsonStringEnumConverter<TransactionStatus>(allowIntegerValues: false);
