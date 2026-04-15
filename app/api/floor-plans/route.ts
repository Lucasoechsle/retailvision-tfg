import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const storeId = formData.get("storeId") as string;
  const name = formData.get("name") as string || "Plano Principal";

  if (!file || !storeId) {
    return NextResponse.json({ error: "Archivo y storeId requeridos" }, { status: 400 });
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${storeId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("floor-plans")
    .upload(fileName, file);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("floor-plans")
    .getPublicUrl(fileName);

  const { data: floorPlan, error } = await supabase
    .from("floor_plans")
    .insert({
      store_id: storeId,
      name,
      image_url: urlData.publicUrl,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ floorPlan }, { status: 201 });
}
