import Razorpay from 'razorpay'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 503 })
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const { amount, currency = 'INR' } = await request.json()

    const options = {
      amount: amount * 100,
      currency,
      receipt: `receipt_${Date.now()}`,
    }

    const order = await razorpay.orders.create(options)

    return NextResponse.json({ orderId: order.id })
  } catch (error) {
    console.error('Razorpay error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}