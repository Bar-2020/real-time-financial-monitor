using System.Text.Json.Serialization;
using FinancialMonitor.Api.Models;

namespace FinancialMonitor.Api.Json;

public sealed class TransactionStatusConverter()
    : JsonStringEnumConverter<TransactionStatus>(allowIntegerValues: false);
