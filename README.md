# Trip Expenses MVP

A complete, production-ready Trip Expenses application built with Next.js 14, Supabase, and Tailwind CSS. Track shared expenses, manage trip rooms, and automatically calculate settlements.

## Features

- 🔐 **Secure Authentication** - Email/password and magic link authentication
- 🏠 **Trip Room Management** - Create and join trip rooms with approval system
- 💰 **Expense Tracking** - Add, approve, and track expenses in real-time
- 📱 **Mobile-First Design** - Responsive design optimized for all devices
- ⚡ **Real-Time Updates** - Live notifications and expense updates
- 🧮 **Smart Settlements** - Automatic calculation of who owes what
- 💱 **Multi-Currency Support** - Support for different currencies per trip

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-4o-mini for expense summaries
- **Styling**: Tailwind CSS + shadcn/ui
- **Real-time**: Supabase Realtime
- **Language**: TypeScript

## Quick Start

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for your project to be fully initialized
3. Go to Settings → API to get your project URL and anon key

### 2. Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (Server-side only)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
AI_SUMMARY_MAX_TOKENS=400
AI_TEMPERATURE=0.2
```

### 3. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the schema creation script below:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create room_members table
CREATE TABLE IF NOT EXISTS room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Create join_requests table
CREATE TABLE IF NOT EXISTS join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_room_id ON join_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);
CREATE INDEX IF NOT EXISTS idx_expenses_room_id ON expenses(room_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Users can view rooms they own or are members of" ON rooms
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() OR 
    id IN (SELECT room_id FROM room_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create rooms" ON rooms
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Only room owners can update rooms" ON rooms
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Only room owners can delete rooms" ON rooms
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- RLS Policies for room_members
CREATE POLICY "Users can view members of rooms they belong to" ON room_members
  FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT id FROM rooms WHERE owner_id = auth.uid()
      UNION
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Room owners can add members" ON room_members
  FOR INSERT TO authenticated
  WITH CHECK (
    room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid())
  );

CREATE POLICY "Room owners can remove members" ON room_members
  FOR DELETE TO authenticated
  USING (
    room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid())
  );

-- RLS Policies for join_requests
CREATE POLICY "Users can view join requests for their rooms or their own requests" ON join_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can create join requests" ON join_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Room owners can update join requests" ON join_requests
  FOR UPDATE TO authenticated
  USING (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()))
  WITH CHECK (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()));

-- RLS Policies for expenses
CREATE POLICY "Users can view expenses in rooms they belong to" ON expenses
  FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT id FROM rooms WHERE owner_id = auth.uid()
      UNION
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can create expenses" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    room_id IN (
      SELECT id FROM rooms WHERE owner_id = auth.uid()
      UNION
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Room owners can update expense status" ON expenses
  FOR UPDATE TO authenticated
  USING (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()))
  WITH CHECK (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()));

-- Function to automatically add room owner as member
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO room_members (room_id, user_id)
  VALUES (NEW.id, NEW.owner_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add owner as member when room is created
CREATE TRIGGER on_room_created
  AFTER INSERT ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_member();
```

### 4. Authentication Setup

1. In your Supabase dashboard, go to Authentication → Settings
2. Enable "Enable email confirmations" (OFF for development)
3. Add your site URL to "Site URL": `http://localhost:3000` for development

### 5. Install Dependencies & Run

```bash
npm install
npm run dev
```

Your app will be available at `http://localhost:3000`

## AI Setup

The app includes AI-powered expense summaries using OpenAI's GPT models.

### Environment Variables

Add these to your `.env.local` file:

```env
# Required - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional - Defaults shown below
OPENAI_MODEL=gpt-4o-mini
AI_SUMMARY_MAX_TOKENS=400
AI_TEMPERATURE=0.2
```

### Features

- **Daily Summary**: Analyzes expenses for a specific date with spending insights and suggestions
- **Final Summary**: Comprehensive trip analysis with settlement explanations and recommendations
- **Privacy**: User emails are anonymized before sending to AI (e.g., jo***@example.com)
- **Security**: API key is server-side only, never exposed to clients

### API Endpoints

#### Daily Summary
```bash
curl -X POST http://localhost:3000/api/ai/daily-summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -d '{"roomId": "room-uuid", "date": "2024-01-15"}'
```

#### Final Summary
```bash
curl -X POST http://localhost:3000/api/ai/final-summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -d '{"roomId": "room-uuid"}'
```

### Deployment Notes

For production deployment (e.g., Netlify):
1. Add `OPENAI_API_KEY` to your deployment environment variables
2. Optionally configure `OPENAI_MODEL`, `AI_SUMMARY_MAX_TOKENS`, and `AI_TEMPERATURE`
3. The AI features will be disabled if `OPENAI_API_KEY` is not set

## Deployment

### Deploy to Netlify

1. Push your code to a Git repository
2. Connect your repository to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `out`
5. Add environment variables in Netlify dashboard
6. Update Supabase Site URL to your Netlify domain

## Usage

1. **Sign Up/Login**: Create an account or login with existing credentials
2. **Create Room**: Click "Create Room" to start a new trip
3. **Invite Members**: Share room ID or approve join requests
4. **Add Expenses**: Members can add expenses that need owner approval
5. **Track Settlement**: View who owes what in the settlement section

## Troubleshooting

### Common Issues

**Authentication Issues**
- Ensure environment variables are correctly set
- Check Supabase site URL matches your domain
- Verify email confirmation settings

**Database Errors**
- Ensure all SQL scripts ran successfully
- Check RLS policies are enabled
- Verify user permissions in Supabase

**Real-time Not Working**
- Check if Realtime is enabled for your tables in Supabase
- Verify network connection and firewall settings

### Development Tips

- Use Supabase Table Editor to view data
- Check browser console for detailed error messages
- Use Supabase logs for debugging backend issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details