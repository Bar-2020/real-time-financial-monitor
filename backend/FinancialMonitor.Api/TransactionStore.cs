namespace FinancialMonitor.Api;

public sealed class TransactionStore
{
    public const int Capacity = 10_000;

    // One lock rather than ConcurrentDictionary: the timestamp check, the write and the
    // eviction must happen as a single atomic step across both collections.
    private readonly object _gate = new();
    private readonly Dictionary<Guid, Transaction> _byId = [];
    private readonly Queue<Guid> _arrivalOrder = new();

    /// <returns>True if the row changed, false if the transaction was a duplicate or out of date.</returns>
    public bool Upsert(Transaction transaction)
    {
        lock (_gate)
        {
            if (_byId.TryGetValue(transaction.TransactionId, out var existing))
            {
                if (transaction.Timestamp <= existing.Timestamp) return false;
            }
            else
            {
                _arrivalOrder.Enqueue(transaction.TransactionId);
                if (_arrivalOrder.Count > Capacity) _byId.Remove(_arrivalOrder.Dequeue());
            }

            _byId[transaction.TransactionId] = transaction;
            return true;
        }
    }

    public IReadOnlyList<Transaction> GetLatest(int limit)
    {
        lock (_gate)
        {
            return _byId.Values.OrderByDescending(t => t.Timestamp).Take(limit).ToList();
        }
    }
}
