"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveRateApiSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const apiKey = String(formData.get("alpha_vantage_api_key") ?? "").trim();

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user!.id,
    alpha_vantage_api_key: apiKey || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
