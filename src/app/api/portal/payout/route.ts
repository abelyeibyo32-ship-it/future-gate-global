import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId, payoutRail, payoutAccount } = await req.json();

    if (!userId || !payoutRail || !payoutAccount) {
      return NextResponse.json(
        { success: false, error: 'User ID, payout rail, and account number are required.' },
        { status: 400 }
      );
    }

    // Update user payout details in SQL
    const updateRes = await db.query(
      `UPDATE users 
       SET payout_rail = $1, 
           payout_account = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, payout_rail AS "payoutRail", payout_account AS "payoutAccount";`,
      [payoutRail, payoutAccount, userId]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payout settings updated successfully in database.',
      user: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Payout update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update payout details.' }, { status: 500 });
  }
}