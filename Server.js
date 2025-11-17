const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();
const app = express();

app.use(express.static('public'));
app.use(express.json());

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'); // Fallback for testing

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.PRICE_ID || 'price_placeholder',
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/`,
    });
    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/generate', async (req, res) => {
  const { niche } = req.body;
  if (!niche) return res.status(400).json({ error: "Niche required" });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'sk_placeholder'}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Generate 10 VIRAL YouTube video ideas with titles and 2-minute scripts for a ${niche} creator. Make them addictive.`
        }],
        temperature: 0.8,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    res.json({ result: data.choices[0].message.content });
  } catch (err) {
    console.error('Generate error:', err); // Logs to Railway
    res.status(500).json({ error: err.message });
  }
});

// Railway/Production: Bind to 0.0.0.0 and dynamic port
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Test route for debugging (remove later)
app.get('/health', (req, res) => res.send('Server alive!'));
