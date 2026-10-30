using System.Text;
using System.Text.Json;

namespace TejarhStore.Web.Services;

public class ZarinpalService
{
    private readonly HttpClient _httpClient;
    private readonly string _merchantId;
    private readonly string _callbackUrl;

    public ZarinpalService(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _merchantId = config["Zarinpal:MerchantId"] ?? "";
        _callbackUrl = config["Zarinpal:CallbackUrl"] ?? "";
    }

    public async Task<(bool Success, string Authority, string? Error)> RequestPaymentAsync(decimal amountToman, string description)
    {
        var payload = new
        {
            merchant_id = _merchantId,
            amount = (long)(amountToman * 10),
            callback_url = _callbackUrl,
            description
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("https://payment.zarinpal.com/pg/v4/payment/request.json", content);
        var responseBody = await response.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(responseBody);
        var data = doc.RootElement.GetProperty("data");

        if (data.TryGetProperty("code", out var code) && code.GetInt32() == 100)
        {
            var authority = data.GetProperty("authority").GetString()!;
            return (true, authority, null);
        }

        return (false, "", "خطا در اتصال به درگاه پرداخت");
    }

    public string GetPaymentUrl(string authority) =>
        $"https://payment.zarinpal.com/pg/StartPay/{authority}";

    public async Task<(bool Success, string? RefId)> VerifyPaymentAsync(string authority, decimal amountToman)
    {
        var payload = new
        {
            merchant_id = _merchantId,
            amount = (long)(amountToman * 10),
            authority
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("https://payment.zarinpal.com/pg/v4/payment/verify.json", content);
        var responseBody = await response.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(responseBody);
        var data = doc.RootElement.GetProperty("data");

        if (data.TryGetProperty("code", out var code) && (code.GetInt32() == 100 || code.GetInt32() == 101))
        {
            var refId = data.GetProperty("ref_id").GetRawText();
            return (true, refId);
        }

        return (false, null);
    }
}
