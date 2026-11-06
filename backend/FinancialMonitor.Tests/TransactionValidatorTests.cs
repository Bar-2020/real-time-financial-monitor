using FinancialMonitor.Api;

namespace FinancialMonitor.Tests;

public class TransactionValidatorTests
{
    private readonly TransactionValidator _validator = new();

    private void AssertRejected(Transaction tx, string property)
    {
        var result = _validator.Validate(tx);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == property);
    }

    [Fact]
    public void Accepts_a_valid_transaction() =>
        Assert.True(_validator.Validate(TestData.Tx()).IsValid);

    [Fact]
    public void Rejects_an_empty_transaction_id() =>
        AssertRejected(TestData.Tx() with { TransactionId = Guid.Empty }, nameof(Transaction.TransactionId));

    [Theory]
    [InlineData(0)]
    [InlineData(-0.01)]
    public void Rejects_an_amount_that_is_not_positive(double amount) =>
        AssertRejected(TestData.Tx() with { Amount = (decimal)amount }, nameof(Transaction.Amount));

    [Theory]
    [InlineData("")]
    [InlineData("usd")]
    [InlineData("US")]
    [InlineData("USDX")]
    [InlineData("U1D")]
    [InlineData("USD\n")]
    public void Rejects_a_currency_that_is_not_three_capital_letters(string currency) =>
        AssertRejected(TestData.Tx() with { Currency = currency }, nameof(Transaction.Currency));

    [Theory]
    [InlineData(0)]
    [InlineData(3)]
    [InlineData(99)]
    public void Rejects_a_status_that_is_not_defined(int status) =>
        AssertRejected(TestData.Tx() with { Status = (TransactionStatus)status }, nameof(Transaction.Status));

    [Fact]
    public void Rejects_a_missing_timestamp() =>
        AssertRejected(TestData.Tx() with { Timestamp = default }, nameof(Transaction.Timestamp));
}
