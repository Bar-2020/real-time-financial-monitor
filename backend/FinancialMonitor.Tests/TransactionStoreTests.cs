using FinancialMonitor.Api;

namespace FinancialMonitor.Tests;

public class TransactionStoreTests
{
    private readonly TransactionStore _store = new();

    [Fact]
    public void A_new_transaction_is_stored()
    {
        var tx = TestData.Tx();

        Assert.True(_store.Upsert(tx));
        Assert.Equal(tx, Assert.Single(_store.GetLatest(10)));
    }

    [Fact]
    public void Latest_returns_newest_first_up_to_the_limit()
    {
        var oldest = TestData.Tx(secondsLater: 1);
        var newest = TestData.Tx(secondsLater: 3);
        var middle = TestData.Tx(secondsLater: 2);
        _store.Upsert(oldest);
        _store.Upsert(newest);
        _store.Upsert(middle);

        Assert.Equal([newest, middle], _store.GetLatest(2));
    }

    [Fact]
    public void A_newer_timestamp_updates_the_row()
    {
        var id = Guid.NewGuid();
        var completed = TestData.Tx(id, TransactionStatus.Completed, secondsLater: 2);
        _store.Upsert(TestData.Tx(id, TransactionStatus.Pending, secondsLater: 1));

        Assert.True(_store.Upsert(completed));
        Assert.Equal(completed, Assert.Single(_store.GetLatest(10)));
    }

    [Fact]
    public void An_older_timestamp_is_ignored()
    {
        var id = Guid.NewGuid();
        var completed = TestData.Tx(id, TransactionStatus.Completed, secondsLater: 2);
        _store.Upsert(completed);

        Assert.False(_store.Upsert(TestData.Tx(id, TransactionStatus.Pending, secondsLater: 1)));
        Assert.Equal(completed, Assert.Single(_store.GetLatest(10)));
    }

    [Fact]
    public void An_identical_redelivery_is_ignored()
    {
        var tx = TestData.Tx();
        _store.Upsert(tx);

        Assert.False(_store.Upsert(tx));
    }

    [Fact]
    public void Past_capacity_the_oldest_arrival_is_evicted()
    {
        var first = TestData.Tx();
        _store.Upsert(first);

        for (var i = 0; i < TransactionStore.Capacity; i++)
            _store.Upsert(TestData.Tx(secondsLater: i + 1));

        var stored = _store.GetLatest(int.MaxValue);
        Assert.Equal(TransactionStore.Capacity, stored.Count);
        Assert.DoesNotContain(first, stored);
    }

    [Fact]
    public void Updating_a_row_past_capacity_does_not_evict_anything()
    {
        var id = Guid.NewGuid();
        _store.Upsert(TestData.Tx(id));
        for (var i = 0; i < TransactionStore.Capacity - 1; i++)
            _store.Upsert(TestData.Tx(secondsLater: i + 1));

        _store.Upsert(TestData.Tx(id, TransactionStatus.Completed, secondsLater: 1));

        Assert.Equal(TransactionStore.Capacity, _store.GetLatest(int.MaxValue).Count);
    }

    [Fact]
    public void Parallel_writes_of_different_ids_all_land()
    {
        const int count = 1_000;

        Parallel.For(0, count, i => Assert.True(_store.Upsert(TestData.Tx(secondsLater: i))));

        Assert.Equal(count, _store.GetLatest(int.MaxValue).Count);
    }

    [Fact]
    public void Parallel_writes_to_one_id_leave_the_newest()
    {
        const int count = 100;
        var id = Guid.NewGuid();

        Parallel.For(0, count, i => _store.Upsert(TestData.Tx(id, secondsLater: i)));

        var stored = Assert.Single(_store.GetLatest(10));
        Assert.Equal(TestData.BaseTime.AddSeconds(count - 1), stored.Timestamp);
    }

    [Fact]
    public void Parallel_writes_past_capacity_keep_exactly_capacity_rows()
    {
        Parallel.For(0, TransactionStore.Capacity * 2, i => _store.Upsert(TestData.Tx(secondsLater: i)));

        Assert.Equal(TransactionStore.Capacity, _store.GetLatest(int.MaxValue).Count);
    }

    [Fact]
    public async Task Reads_during_writes_never_fail()
    {
        var writer = Task.Run(() =>
            Parallel.For(0, 5_000, i => _store.Upsert(TestData.Tx(secondsLater: i))));

        while (!writer.IsCompleted)
            _ = _store.GetLatest(100);

        await writer;
    }
}
