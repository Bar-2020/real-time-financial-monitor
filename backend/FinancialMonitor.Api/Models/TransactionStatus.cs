using System.Text.Json.Serialization;
using FinancialMonitor.Api.Json;

namespace FinancialMonitor.Api.Models;

// Values start at 1 so a missing status fails validation. They are powers of two so a
// comma-joined status like "Pending,Completed" parses to an undefined value and fails too.
[JsonConverter(typeof(TransactionStatusConverter))]
public enum TransactionStatus
{
    Pending = 1,
    Completed = 2,
    Failed = 4,
}
