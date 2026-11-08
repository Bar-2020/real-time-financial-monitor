using System.Text.Json.Serialization;
using FinancialMonitor.Api.Models;

namespace FinancialMonitor.Api.Converters;

internal sealed class TransactionStatusConverter()
    : JsonStringEnumConverter<TransactionStatus>(allowIntegerValues: false);
