import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Fetches the current market rate for a pair via Alpha Vantage, using the caller's own saved API key. */
export async function GET(request: NextRequest) {
  const pair = request.nextUrl.searchParams.get("pair")?.toUpperCase() ?? "";
  if (pair.length !== 6) {
    return NextResponse.json({ error: "通貨ペアが不正です" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("alpha_vantage_api_key")
    .maybeSingle();
  const apiKey = settings?.alpha_vantage_api_key;
  if (!apiKey) {
    return NextResponse.json(
      { error: "APIキーが未設定です。「設定」ページでAlpha Vantage APIキーを登録してください。" },
      { status: 400 }
    );
  }

  const fromCurrency = pair.slice(0, 3);
  const toCurrency = pair.slice(3, 6);
  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${apiKey}`;

  let json: Record<string, unknown>;
  try {
    const res = await fetch(url, { cache: "no-store" });
    json = await res.json();
  } catch {
    return NextResponse.json({ error: "レート取得先への接続に失敗しました" }, { status: 502 });
  }

  const quote = json["Realtime Currency Exchange Rate"] as Record<string, string> | undefined;
  const rateStr = quote?.["5. Exchange Rate"];
  const rate = rateStr ? Number(rateStr) : NaN;

  if (!Number.isFinite(rate)) {
    const note = (json.Note ?? json.Information ?? json["Error Message"]) as string | undefined;
    return NextResponse.json(
      { error: note ?? "レートを取得できませんでした。通貨ペアやAPIキーを確認してください。" },
      { status: 502 }
    );
  }

  return NextResponse.json({ rate });
}
