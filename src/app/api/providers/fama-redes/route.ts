import { NextRequest, NextResponse } from 'next/server';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientComponentClient();
    const { data: provider } = await supabase
      .from('providers')
      .select('*')
      .eq('name', 'FamaRedes')
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Simulated API response in the correct format
    const services = [
      {
        service: 1,
        name: "Instagram Followers",
        type: "Default",
        category: "Instagram",
        rate: "1.50",
        min: "100",
        max: "10000",
        refill: true
      },
      {
        service: 2,
        name: "Instagram Likes",
        type: "Default",
        category: "Instagram",
        rate: "0.80",
        min: "50",
        max: "5000",
        refill: true
      },
      {
        service: 3,
        name: "Facebook Page Likes",
        type: "Default",
        category: "Facebook",
        rate: "2.00",
        min: "100",
        max: "20000",
        refill: false
      },
      {
        service: 4,
        name: "TikTok Followers",
        type: "Default",
        category: "TikTok",
        rate: "2.50",
        min: "100",
        max: "50000",
        refill: true
      }
    ];

    return NextResponse.json(services);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
