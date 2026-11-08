using FinancialMonitor.Api.Models;
using FinancialMonitor.Api.Validators;

namespace FinancialMonitor.Tests;

public sealed class TransactionValidatorTests
{
    private static void AssertRejected(Transaction transaction, string field) =>
        Assert.True(TransactionValidator.Validate(transaction).ContainsKey(field));

    [Fact]
    public void Accepts_a_valid_transaction() =>
        Assert.Empty(TransactionValidator.Validate(TestData.Tx()));

    [Fact]
    public void Rejects_an_empty_transaction_id() =>
        AssertRejected(TestData.Tx() with { TransactionId = Guid.Empty }, "transactionId");

    [Theory]
    [InlineData(0)]
    [InlineData(-0.01)]
    public void Rejects_an_amount_that_is_not_positive(double amount) =>
        AssertRejected(TestData.Tx() with { Amount = (decimal)amount }, "amount");

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("usd")]
    [InlineData("US")]
    [InlineData("USDX")]
    [InlineData("U1D")]
    [InlineData("USD\n")]
    public void Rejects_a_currency_that_is_not_three_capital_letters(string? currency) =>
        AssertRejected(TestData.Tx() with { Currency = currency! }, "currency");

    [Theory]
    [InlineData(0)]
    [InlineData(3)]
    [InlineData(99)]
    public void Rejects_a_status_that_is_not_defined(int status) =>
        AssertRejected(TestData.Tx() with { Status = (TransactionStatus)status }, "status");

    [Fact]
    public void Rejects_a_missing_timestamp() =>
        AssertRejected(TestData.Tx() with { Timestamp = default }, "timestamp");
}
