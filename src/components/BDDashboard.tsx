"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  Users, 
  Presentation, 
  Users2, 
  Target, 
  Save, 
  Loader2, 
  Calendar as CalendarIcon,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,  // Add this for a safety icon
  CheckSquare, // add this import for deals being closed
  Handshake,// add this import for deals being closed
  FileX, // for Terminations
  FileText, // for Bidding
  Mountain, // for Rocks
  ClipboardList, // for Issues List
  ClipboardCheck, // add this for meeting notes/guidelines
  ShieldQuestion, // For Obejctions
  UsersRound, // add this for Association Memberships
  TrendingUp, // for header
  X,
} from 'lucide-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import CalendarEventsView from './CalendarEventsView';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, addDays } from 'date-fns';

// Format number with commas (e.g., 1000 → 1,000)
const formatNumberWithCommas = (value: string): string => {
  // Remove any non-numeric characters except decimal point
  const numValue = value.replace(/[^0-9.]/g, '');
  
  // If it's not a valid number, return as is
  if (isNaN(parseFloat(numValue))) return value;
  
  // Split by decimal point
  const parts = numValue.split('.');
  
  // Format the integer part with commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Join back with decimal part if it exists
  return parts.join('.');
};


// Data Types and Interfaces
interface FormData {
  attendees: string;
  safetyMessage: string;
  encoreValues: string;
  closingDeals: string;
  biddingDeals: string;
  hotProperties: string;
  terminationChanges: string;
  associationUpdate: string;
  associationEvents: AssociationEvent[];
  lvMonthlyRevenueActual: string;
  lvMonthlyRevenueGoal: string;
  phxMonthlyRevenueActual: string;
  phxMonthlyRevenueGoal: string;
}

// Add this new interface underneath
interface AssociationEvent {
  id: string | null;
  title: string;
  date: string;
  location: string;
  assignee: string;
}

// Update Property Revenue for Monthly Revenue Detail
interface PropertyRevenue {
  id: string | null;
  name: string;
  revenue: number;
  isEditing?: boolean;
  // Add this field for temporary editing
  tempRevenue?: string;
}

interface YearlyGoals {
  id: string | null;
  year: number;
  region: string; // Added region field
  revenueTarget: string;
  revenueDescription: string;
  retentionGoal: string;
  retentionDescription: string;
  currentRevenue: string;
  currentRetention: string;
}

interface PropertyRevenue {
  name: string;
  revenue: number;
}

interface PropertyRevenueData {
  [key: string]: PropertyRevenue[];
}

interface Issue {
  id: string | null;
  issueText: string;
  isCompleted: boolean;
  assignedTo: string;
  dueDate: Date | null;
}

interface IssueRecord {
  id: string;
  issue_text: string;
  is_completed: boolean;
  assigned_to: string | null;
  due_date: string | null;
  week_start_date: string;
  created_at: string;
  updated_at: string;
}

interface QuarterlyRockRecord {
  id: string;
  title: string;
  category: string;
  assigned_to: string;
  current_groups?: string;
  action_items?: string;
  current_status?: string;
  updates_notes?: string;
  event_details?: string;
  week_start_date: string;
  created_at: string;
  updated_at: string;
}

interface GuidelineRecord {
  id: string;
  guideline_text: string;
  category: string;
  sort_order: number;
  week_start_date?: string;
  created_at: string;
  updated_at: string;
}

interface ObjectionRecord {
  id: string;
  objection: string;
  rebuttal: string;
  things_to_say: string;
  things_not_to_say: string;
  created_at: string;
  updated_at: string;
}

interface QuickTipRecord {
  id: string;
  category: string;
  tip_text: string;
  created_at: string;
  updated_at: string;
}

interface MembershipRecord {
  id: string;
  sales_rep: string;
  groups: string | null;
  committees: string | null;
  meeting_schedule: string | null;
  meetings_attended: number | null;
  total_meetings: number | null;
  created_at: string;
  updated_at: string;
}

interface CreGroups {
  id: string | null;
  title: string;
  assignedTo: string;
  currentGroups: string;
  actionItems: string;
}

interface ProductionRates {
  id: string | null;
  title: string;
  assignedTo: string;
  currentStatus: string;
  updatesNotes: string;
}

interface Events {
  id: string | null;
  title: string;
  assignedTo: string;
  puttingWorldEvent: string;
  lvCharcuterieEvent: string;
}

interface QuarterlyRocks {
  creGroups: CreGroups;
  productionRates: ProductionRates;
  events: Events;
}

interface Guideline {
  id: string | null;
  guidelineText: string;
  category: string;
  sortOrder: number;
}

interface Objection {
  id: string | null;
  objection: string;
  rebuttal: string;
  thingsToSay: string;
  thingsNotToSay: string;
  isEditing?: boolean;
}

interface QuickTip {
  id: string | null;
  category: string;
  tipText: string;
}

interface Membership {
  id: string | null;
  salesRep: string;
  groups: string;
  committees: string;
  meetingSchedule: string;
  meetingsAttended: number;
  totalMeetings: number;
  isEditing?: boolean;
}

interface Target {
  id: string;
  contact_name: string;
  contact_title: string;
  contact_email: string;
  company: string;
  properties: string;
  sales_rep: string;
  sales_rep_name: string;
  notes: string;
  status?: string;
  projected_value: string;
  created_at?: string;
  updated_at?: string;
  company_id?: string;
}

interface WeekOption {
  value: string;
  label: string;
}

interface TabErrors {
  [key: string]: {
    message: string;
    details?: any;
  };
}

interface CachedFormData {
  [key: string]: {
    formData: FormData;
    selectedDate: Date;
    currentMeetingId: string | null;
  };
}
// Custom hook for Supabase initialization
const useSupabase = () => {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Log configuration status
    console.log('Supabase URL defined:', !!supabaseUrl, supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'undefined');
    console.log('Supabase Key defined:', !!supabaseKey, supabaseKey ? `${supabaseKey.substring(0, 5)}...${supabaseKey.substring(supabaseKey.length - 5)}` : 'undefined');

    // Check for missing config
    if (!supabaseUrl || !supabaseKey) {
      setConnectionError('Supabase configuration is incomplete. Please check your environment variables.');
      return;
    }

    // Initialize Supabase client
    try {
      const client = createClient(supabaseUrl, supabaseKey, {
        auth: { 
          persistSession: true,
          autoRefreshToken: true
        }
      });
      setSupabase(client);
      console.log('Supabase client initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize Supabase client:', error);
      setConnectionError(`Failed to initialize Supabase client: ${error.message || 'Unknown error'}`);
    }
  }, []);

  // Function to check connection
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!supabase) {
      setConnectionError('Supabase client is not initialized. Check your environment variables.');
      return false;
    }
    
    try {
      console.log('Testing Supabase connection...');
      const { error } = await supabase.from('level10_meetings').select('count').limit(1);
      
      if (error) {
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          console.log('Database is accessible but tables are not set up:', error.message);
          setConnectionError('Database is accessible, but required tables do not exist. Please run the setup SQL script.');
        } else {
          console.error('Database connection test failed:', error);
          setConnectionError(`Database connection failed: ${error.message}`);
        }
        return false;
      } else {
        console.log('Database connection test successful - skipping write permission test for now');
        setConnectionError(null);
        return true;
      }
    } catch (error: any) {
      console.error('Failed to check database connection:', error);
      setConnectionError(`Failed to connect to database: ${error.message || 'Unknown error'}`);
      return false;
    }
  }, [supabase]);

  // Function to set up database tables
  const setupDatabase = useCallback(async (): Promise<boolean> => {
    if (!supabase) return false;
    
    try {
      const setupSQL = `
        -- Level 10 Meetings table
        CREATE TABLE IF NOT EXISTS level10_meetings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          meeting_date TIMESTAMPTZ,
          week_start_date DATE,
          attendees TEXT,
          safety_message TEXT,
          encore_values TEXT,
          closing_deals TEXT,
          bidding_deals TEXT,
          hot_properties TEXT,
          termination_changes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        -- Yearly Goals table
        CREATE TABLE IF NOT EXISTS yearly_goals (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          year INT,
          region TEXT DEFAULT 'Las Vegas',
          revenue_target NUMERIC,
          revenue_description TEXT,
          retention_goal NUMERIC,
          retention_description TEXT,
          current_revenue NUMERIC,
          current_retention NUMERIC,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        -- Issues List table
        CREATE TABLE IF NOT EXISTS issues_list (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          issue_text TEXT,
          is_completed BOOLEAN DEFAULT FALSE,
          assigned_to TEXT,
          due_date DATE,
          week_start_date DATE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        -- Quarterly Rocks table
        CREATE TABLE IF NOT EXISTS quarterly_rocks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title TEXT,
          category TEXT,
          assigned_to TEXT,
          current_groups TEXT,
          action_items TEXT,
          current_status TEXT,
          updates_notes TEXT,
          event_details JSONB,
          week_start_date DATE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        -- Meeting Guidelines table
        CREATE TABLE IF NOT EXISTS meeting_guidelines (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          guideline_text TEXT,
          category TEXT,
          sort_order INT,
          week_start_date DATE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        -- Objection Handling table
        CREATE TABLE IF NOT EXISTS objection_handling (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          objection TEXT,
          rebuttal TEXT,
          things_to_say TEXT,
          things_not_to_say TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        -- Quick Tips table
        CREATE TABLE IF NOT EXISTS quick_tips (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          category TEXT,
          tip_text TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        -- Association Memberships table
        CREATE TABLE IF NOT EXISTS association_memberships (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          sales_rep TEXT,
          groups TEXT,
          committees TEXT,
          meeting_schedule TEXT,
          meetings_attended INT DEFAULT 0,
          total_meetings INT DEFAULT 0,
          week_start_date DATE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        -- Targets table
        CREATE TABLE IF NOT EXISTS targets (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          contact_name TEXT,
          contact_title TEXT,
          contact_email TEXT,
          company TEXT,
          properties TEXT,
          sales_rep TEXT,
          sales_rep_name TEXT,
          notes TEXT,
          status TEXT DEFAULT 'active',
          projected_value TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add row level security policy for public access
        ALTER TABLE level10_meetings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE yearly_goals ENABLE ROW LEVEL SECURITY;
        ALTER TABLE issues_list ENABLE ROW LEVEL SECURITY;
        ALTER TABLE quarterly_rocks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE meeting_guidelines ENABLE ROW LEVEL SECURITY;
        ALTER TABLE objection_handling ENABLE ROW LEVEL SECURITY;
        ALTER TABLE quick_tips ENABLE ROW LEVEL SECURITY;
        ALTER TABLE association_memberships ENABLE ROW LEVEL SECURITY;
        ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

        -- Create permissive policy for all tables
        DO $$
        DECLARE
          t text;
        BEGIN
          FOR t IN 
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name IN (
                'level10_meetings', 'yearly_goals', 'issues_list', 
                'quarterly_rocks', 'meeting_guidelines', 'objection_handling', 
                'quick_tips', 'association_memberships', 'targets'
              )
          LOOP
            EXECUTE format('DROP POLICY IF EXISTS policy_all ON %I', t);
            EXECUTE format('CREATE POLICY policy_all ON %I USING (true) WITH CHECK (true)', t);
          END LOOP;
        END;
        $$;
      `;
      
      const { error } = await supabase.rpc('exec_sql', { sql: setupSQL });
      
      if (error) {
        console.error('Error setting up database tables:', error);
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          throw new Error('The "exec_sql" RPC function does not exist. Please contact your Supabase administrator to enable it or create tables manually.');
        }
        throw error;
      }
      
      console.log('Database tables created successfully!');
      setConnectionError(null);
      return true;
    } catch (error: any) {
      console.error('Failed to set up database:', error);
      setConnectionError(`Failed to set up database: ${error.message || 'Unknown error'}`);
      return false;
    }
  }, [supabase]);

  return { supabase, connectionError, setConnectionError, checkConnection, setupDatabase };
};

// ========================
// UI Components
// ========================

// Enhanced section header component
interface SectionHeaderProps {
  title: string;
}

const SectionHeader = ({ title }: SectionHeaderProps) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    <div className="h-1 w-20 bg-blue-600 mt-2 rounded-full"></div>
  </div>
);

// Enhanced form field component
interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder: string;
  isTextArea?: boolean;
  icon?: React.ReactNode; // Add this line
}

const FormField = ({ 
  label, 
  name, 
  value, 
  onChange, 
  placeholder, 
  isTextArea = false,
  icon // Add this parameter
}: FormFieldProps) => (
  <div className="space-y-2 transition-all duration-200 hover:shadow-sm">
    <div className="flex items-center">
      {icon && <span className="mr-2">{icon}</span>}
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    </div>
    {isTextArea ? (
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-200 rounded-lg p-3 transition-colors duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 min-h-[120px]"
      />
    ) : (
      <Input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-200 rounded-lg p-3 transition-colors duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />
    )}
  </div>
);

// Error card component for displaying detailed errors
interface ErrorCardProps {
  title: string;
  error: string | { message?: string; details?: any } | null;
  onRetry?: () => void;
}

const ErrorCard = ({ 
  title, 
  error, 
  onRetry 
}: ErrorCardProps) => (
  <div className="bg-white rounded-xl p-4 shadow-md border border-red-200 mb-4">
    <div className="flex items-center text-red-600 mb-3">
      <AlertTriangle className="h-5 w-5 mr-2" />
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
    <p className="text-sm text-gray-700 mb-3">
      {typeof error === 'string' ? error : (error?.message || 'An unknown error occurred')}
    </p>
    {error && typeof error !== 'string' && error.details && (
      <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto mb-3">
        {JSON.stringify(error.details, null, 2)}
      </pre>
    )}
    {onRetry && (
      <Button 
        size="sm" 
        className="bg-red-600 hover:bg-red-700 text-white" 
        onClick={onRetry}
      >
        <RefreshCw className="w-4 h-4 mr-2" /> Retry
      </Button>
    )}
  </div>
);

// Loading indicator component
interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator = ({ message = "Loading..." }: LoadingIndicatorProps) => (
  <div className="flex justify-center items-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-3" />
    <span className="text-gray-600">{message}</span>
  </div>
);

// Save button with status indicator
interface SaveButtonProps {
  onClick: () => void;
  status: 'idle' | 'saving' | 'success' | 'error';
  disabled?: boolean;
}

const SaveButton = ({ onClick, status, disabled }: SaveButtonProps) => {
  const getButtonStyle = () => {
    switch (status) {
      case 'saving':
        return 'bg-blue-400 hover:bg-blue-400';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };
  
  return (
    <Button 
      className={`${getButtonStyle()} text-white rounded-lg px-6 py-2 transition-all duration-200 transform hover:scale-105`}
      onClick={onClick}
      disabled={disabled || status === 'saving'}
    >
      {status === 'saving' ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
      ) : status === 'success' ? (
        <><Save className="mr-2 h-4 w-4" /> Saved!</>
      ) : status === 'error' ? (
        <><AlertTriangle className="mr-2 h-4 w-4" /> Error</>
      ) : (
        <><Save className="mr-2 h-4 w-4" /> Save Changes</>
      )}
    </Button>
  );
};

// ========================
// Component & Data - Part 2
// ========================

const BDDashboard = () => {
  // Use custom Supabase hook
  const { supabase, connectionError, setConnectionError, checkConnection, setupDatabase } = useSupabase();
  
  // ========================
  // State Management
  // ========================
 

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [tabErrors, setTabErrors] = useState<TabErrors>({});
  const [isFormModified, setIsFormModified] = useState<boolean>(false);
  const [isTargetListModified, setIsTargetListModified] = useState<boolean>(false);
  
  // Tab and week selection state
  const [activeTab, setActiveTab] = useState<string>("level10");
  const [visitedTabs, setVisitedTabs] = useState<string[]>(["level10"]);
  const [selectedWeek, setSelectedWeek] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [weekOptions, setWeekOptions] = useState<WeekOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Data caching
  const [cachedFormData, setCachedFormData] = useState<CachedFormData>({});
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const lastFetchedRef = useRef<{[key: string]: number}>({});
  const revenueInputRefs = useRef<{[region: string]: {[index: number]: HTMLInputElement}}>({});
  
// 3. Add these state variables inside your BDDashboard component for Revenue Details
const [showRevenueDetails, setShowRevenueDetails] = useState<boolean>(false);
const [activeRegionDetails, setActiveRegionDetails] = useState<'Las Vegas' | 'Phoenix' | null>(null);

// Property revenues data (sample data for the modal)
const [propertyRevenues, setPropertyRevenues] = useState<PropertyRevenueData>({
  'Las Vegas': [
    { id: null, name: 'Downtown Office Plaza', revenue: 125000 },
    { id: null, name: 'Summerlin Business Park', revenue: 82500 },
    { id: null, name: 'Henderson Medical Center', revenue: 67000 },
    { id: null, name: 'Spring Valley Shopping Center', revenue: 45000 },
    { id: null, name: 'Warm Springs Corporate Park', revenue: 93000 }
  ],
  'Phoenix': [
    { id: null, name: 'Camelback Corporate Center', revenue: 105000 },
    { id: null, name: 'Scottsdale Office Tower', revenue: 78000 },
    { id: null, name: 'Tempe Technology Park', revenue: 113000 },
    { id: null, name: 'Glendale Shopping Mall', revenue: 59000 },
    { id: null, name: 'Mesa Medical Complex', revenue: 69500 }
  ]
});

// Update to
const [formData, setFormData] = useState<FormData>({
  attendees: '',
  safetyMessage: '',
  encoreValues: '',
  closingDeals: '',
  biddingDeals: '',
  hotProperties: '',
  terminationChanges: '',
  associationUpdate: '',
  associationEvents: [],
  lvMonthlyRevenueActual: '0',
  lvMonthlyRevenueGoal: '0',
  phxMonthlyRevenueActual: '0',
  phxMonthlyRevenueGoal: '0'
});

  // Vision Traction Organizer data - Updated for regions
  const [yearlyGoals, setYearlyGoals] = useState<{[key: string]: YearlyGoals}>({
    'Las Vegas': {
      id: null,
      year: new Date().getFullYear(),
      region: 'Las Vegas',
      revenueTarget: '1.25',
      revenueDescription: 'new maintenance',
      retentionGoal: '90',
      retentionDescription: 'customer retention',
      currentRevenue: '2.85',
      currentRetention: '97'
    },
    'Phoenix': {
      id: null,
      year: new Date().getFullYear(),
      region: 'Phoenix',
      revenueTarget: '2.75',
      revenueDescription: 'new maintenance',
      retentionGoal: '90',
      retentionDescription: 'customer retention',
      currentRevenue: '2.40',
      currentRetention: '97'
    }
  });

  const [issuesList, setIssuesList] = useState<Issue[]>([
    { id: null, issueText: "Create dream 100 list", isCompleted: false, assignedTo: "Sarah", dueDate: new Date() },
    { id: null, issueText: "Monthly budgets for spend", isCompleted: false, assignedTo: "Mike", dueDate: new Date() },
    { id: null, issueText: "Residential tree pruning fact sheet/social post", isCompleted: false, assignedTo: "Lisa", dueDate: new Date() },
    { id: null, issueText: "Visual aids to show internal communication", isCompleted: false, assignedTo: "John", dueDate: new Date() }
  ]);

  const [quarterlyRocks, setQuarterlyRocks] = useState<QuarterlyRocks>({
    creGroups: {
      id: null,
      title: 'CRE Groups & Committees',
      assignedTo: 'Andy & Jade',
      currentGroups: '- BOMA Executive Committee\n- NAIOP Development Committee\n- ULI Advisory Board\n- CCIM Chapter Leadership',
      actionItems: '- Schedule Q2 committee meetings\n- Submit speaker proposal for BOMA\n- Follow up on ULI mentorship program\n- Coordinate NAIOP networking event'
    },
    productionRates: {
      id: null,
      title: 'Production Rates in Aspire',
      assignedTo: 'Mike',
      currentStatus: 'Implementation Phase - 75% Complete',
      updatesNotes: '- Data migration completed for Q1\n- Team training scheduled for next week\n- New metrics dashboard in testing\n- Revenue forecasting module pending review'
    },
    events: {
      id: null,
      title: 'Q3-4 Events Planning',
      assignedTo: 'Mike',
      puttingWorldEvent: 'Date: September 15\nLocation: Putting World LV\nExpected Attendance: 75\nBudget Status: Approved\nKey Activities:\n- VIP area reserved\n- Catering quotes received\n- Save-the-dates scheduled for July 1',
      lvCharcuterieEvent: 'Date: November 8\nLocation: LV Charcuterie Downtown\nExpected Attendance: 50\nBudget Status: Pending Approval\nKey Activities:\n- Venue walk-through scheduled\n- Menu selection in progress\n- Sponsorship packages drafted'
    }
  });

  // Presentations data
  const [meetingGuidelines, setMeetingGuidelines] = useState<Guideline[]>([
    { id: null, guidelineText: "Copy of proposal. Know it like the back of your hand. Know the boundaries spot on.", category: "Meeting Preparation", sortOrder: 1 },
    { id: null, guidelineText: "List of references, notable accounts & companies we work with", category: "Meeting Preparation", sortOrder: 2 },
    { id: null, guidelineText: "Write down names of people in the meeting, refer to them by name during meeting", category: "Meeting Preparation", sortOrder: 3 }
  ]);

  const [objectionHandling, setObjectionHandling] = useState<Objection[]>([
    { id: null, objection: "Your price is higher than competitors", rebuttal: "We focus on total cost of ownership. Our solutions include comprehensive support and proven reliability that reduces long-term expenses.", thingsToSay: "Let me show you our ROI analysis\nHere's how we've saved others money\nConsider these long-term benefits", thingsNotToSay: "We're expensive because we're the best\nOthers cut corners\nYou get what you pay for" },
    { id: null, objection: "We're happy with current provider", rebuttal: "That's great to hear. Many of our current clients said the same before discovering how our innovative approaches could further improve their operations.", thingsToSay: "What do you like most about them?\nMay I share what sets us apart?\nCould we be your backup option?", thingsNotToSay: "They're outdated\nYou're missing out\nBut we're better" },
    { id: null, objection: "Not in this year's budget", rebuttal: "Understanding budget constraints is important. Let's explore how our solution could fit within your current financial framework or plan for next cycle.", thingsToSay: "When does your fiscal year start?\nLet's explore financing options\nWould phased implementation help?", thingsNotToSay: "You can't afford not to\nFind the money somewhere\nIt's not that expensive" }
  ]);

  const [quickTips, setQuickTips] = useState<QuickTip[]>([
    { id: null, category: "Opening", tipText: "Start with questions about their business challenges" },
    { id: null, category: "Presentation", tipText: "Focus on their specific needs and ROI" },
    { id: null, category: "Follow-up", tipText: "Always schedule next steps before leaving" }
  ]);

  // Memberships data
  const [memberships, setMemberships] = useState<Membership[]>([
    { id: null, salesRep: "Sarah Johnson", groups: "BOMA, NAIOP", committees: "Education Committee, Events Committee", meetingSchedule: "2nd Tuesday, 4th Thursday", meetingsAttended: 3, totalMeetings: 3, isEditing: false },
    { id: null, salesRep: "Mike Chen", groups: "ULI", committees: "Development Council", meetingSchedule: "1st Wednesday", meetingsAttended: 2, totalMeetings: 3, isEditing: false },
    { id: null, salesRep: "Lisa Brown", groups: "CCIM, CREW", committees: "Membership Committee", meetingSchedule: "3rd Monday", meetingsAttended: 3, totalMeetings: 3, isEditing: false },
    { id: null, salesRep: "John Smith", groups: "NAIOP", committees: "Government Affairs", meetingSchedule: "Last Friday", meetingsAttended: 2, totalMeetings: 3, isEditing: false }
  ]);

  // Target List data
  const [targets, setTargets] = useState<Target[]>([
    { id: "1", contact_name: "Alex Johnson", contact_title: "Property Manager", contact_email: "alex@example.com", company: "LV Business Center", properties: "Downtown Office Building, Henderson Complex", sales_rep: "SJ", sales_rep_name: "Sarah Johnson", notes: "Interested in landscape renovation for front entrance", created_at: new Date().toISOString(), projected_value: "150" },
    { id: "2", contact_name: "Maria Rodriguez", contact_title: "Facilities Director", contact_email: "maria@example.com", company: "Westside Medical Plaza", properties: "Main Hospital Campus, Satellite Clinics", sales_rep: "MC", sales_rep_name: "Mike Chen", notes: "Meeting scheduled for next month to discuss maintenance contract renewal", created_at: new Date().toISOString(), projected_value: "220" },
    { id: "3", contact_name: "Thomas Wu", contact_title: "Property Owner", contact_email: "thomas@example.com", company: "Wu Properties LLC", properties: "Retail Plaza on Charleston", sales_rep: "LB", sales_rep_name: "Lisa Brown", notes: "Looking for quotes on irrigation system upgrades", created_at: new Date().toISOString(), projected_value: "80" }
  ]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  

  // ========================
  // Utility Functions
  // ========================
  
  // Generate week options for the dropdown
  useEffect(() => {
    const generateWeekOptions = () => {
      const options: WeekOption[] = [];
      const today = new Date();
      
      // Start date: Feb 24, 2025 (Monday)
      const startDate = new Date(2025, 1, 24); // Month is 0-indexed, so 1 = February
      
      // End date: Dec 31, 2025
      const endDate = new Date(2025, 11, 31);
      
      // Generate all weeks in 2025 starting from Feb 24
      let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });
      
      while (currentWeekStart <= endDate) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 4); // Add 4 days to get to Friday
        
        options.push({
          value: format(currentWeekStart, 'yyyy-MM-dd'),
          label: `${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
        });
        
        // Move to next week
        currentWeekStart = addWeeks(currentWeekStart, 1);
      }
      
      setWeekOptions(options);
      
      // Find the appropriate week based on today's date
      const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      
      if (today < startDate) {
        // If today is before the available range, select the first week
        setSelectedWeek(format(startDate, 'yyyy-MM-dd'));
      } else if (today > endDate) {
        // If today is after the available range, select the last week
        setSelectedWeek(options[options.length - 1].value);
      } else {
        // Find the current or next available week
        const currentOrNextWeek = options.find(option => {
          const optionDate = new Date(option.value);
          // Is today within this week or is this the first week after today?
          return (
            (today >= optionDate && today <= addDays(optionDate, 6)) || 
            (today < optionDate)
          );
        });
        
        if (currentOrNextWeek) {
          setSelectedWeek(currentOrNextWeek.value);
        } else {
          // Fallback to the first week if no match found
          setSelectedWeek(options[0].value);
        }
      }
    };
    
    generateWeekOptions();
  }, []);

  // Check database connection when Supabase is initialized
  useEffect(() => {
    if (supabase) {
      checkConnection();
    }
  }, [supabase, checkConnection]);

  // ========================
  // Data Fetching
  // ========================
  
// Main fetch function that handles all data fetching based on active tab
const fetchData = useCallback(async () => {
  if (!supabase || connectionError) return;
  
  console.log(`Fetching data for tab: ${activeTab}`);
  setIsLoading(true);
  
  try {
    if (activeTab === "level10") {
      await fetchMeetingForWeek(selectedWeek);
    } else if (activeTab === "vto") {
      // Fetch VTO data
      console.log('Fetching VTO data...');
      await fetchYearlyGoals();
      await fetchIssuesList();
      await fetchQuarterlyRocks();
    } else if (activeTab === "presentations") {
      // Fetch presentations data
      console.log('Fetching presentations data...');
      await fetchPresentationsData();
    } else if (activeTab === "memberships") {
      // Fetch memberships data
      console.log('Fetching memberships data...');
      await fetchMembershipsData();
    } else if (activeTab === "targetList") {
      // Only fetch target list data if there are no unsaved changes
      if (!isTargetListModified) {
        console.log('Fetching target list data...');
        await fetchTargetsData();
      } else {
        console.log('Using current Target List data (unsaved changes exist)');
      }
    }
  } catch (error: any) {
    console.error(`Error fetching data for ${activeTab}:`, error);
    setTabErrors((prev: TabErrors) => ({
      ...prev,
      [activeTab]: {
        message: `Failed to fetch ${activeTab} data`,
        details: error
      }
    }));
  } finally {
    setIsLoading(false);
  }
}, [activeTab, selectedWeek, supabase, connectionError, isTargetListModified]);
// Fetch Level 10 Meeting data for the selected week
// Fetch Level 10 Meeting data for the selected week
const fetchMeetingForWeek = useCallback(async (weekStartDate: string) => {
  if (!supabase) return;
  
  const lastSaveTime = window.localStorage.getItem('lastSaveTime');
  if (lastSaveTime && (new Date().getTime() - parseInt(lastSaveTime)) < 2000) {
    console.log('Skipping fetch right after save (within 2 seconds of save)');
    return;
  }
  
  // Add this to your fetchMeetingForWeek function. Fetches Property Revenue
  const fetchPropertyRevenues = async (meetingId: string) => {
    if (!supabase) return;
    
    const { data, error } = await supabase
      .from('property_revenues')
      .select('*')
      .eq('meeting_id', meetingId);
      
    if (error) {
      console.error('Error fetching property revenues:', error);
      return;
    }
    
    if (data && data.length > 0) {
      // Group by region
      const revenuesByRegion: PropertyRevenueData = {
        'Las Vegas': [],
        'Phoenix': []
      };
      
      data.forEach(revenue => {
        if (revenuesByRegion[revenue.region]) {
          revenuesByRegion[revenue.region].push({
            id: revenue.id,
            name: revenue.property_name,
            revenue: revenue.revenue
          });
        }
      });
      
      setPropertyRevenues(revenuesByRegion);
    }
  };

  const cacheKey = `level10_${weekStartDate}`;
  if (cachedFormData[cacheKey]) {
    console.log('Using cached data for', cacheKey);
    setFormData(cachedFormData[cacheKey].formData);
    setSelectedDate(cachedFormData[cacheKey].selectedDate);
    setCurrentMeetingId(cachedFormData[cacheKey].currentMeetingId);
    
    // If we have a meeting ID in the cache, fetch property revenues
    if (cachedFormData[cacheKey].currentMeetingId) {
      await fetchPropertyRevenues(cachedFormData[cacheKey].currentMeetingId);
    }
    
    return;
  }
  
  try {
    console.log('Fetching meeting for week starting:', weekStartDate);
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const { data, error } = await supabase
      .from('level10_meetings')
      .select('*')
      .gte('meeting_date', weekStart.toISOString())
      .lte('meeting_date', weekEnd.toISOString())
      .order('meeting_date', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error details from Supabase:', error);
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        console.log('Tables do not exist, returning with default data');
        return;
      }
      throw error;
    }
    
    console.log('Meeting data for week:', data);
    
    if (data && data.length > 0) {
      console.log('Setting form data from database:', data[0]);
      const newFormData: FormData = {
        attendees: data[0].attendees || '',
        safetyMessage: data[0].safety_message || '',
        encoreValues: data[0].encore_values || '',
        closingDeals: data[0].closing_deals || '',
        biddingDeals: data[0].bidding_deals || '',
        hotProperties: data[0].hot_properties || '',
        terminationChanges: data[0].termination_changes || '',
        // New fields
        associationUpdate: data[0].association_update || '',
        associationEvents: [],
        lvMonthlyRevenueActual: data[0].lv_monthly_revenue_actual?.toString() || '0',
        lvMonthlyRevenueGoal: data[0].lv_monthly_revenue_goal?.toString() || '0',
        phxMonthlyRevenueActual: data[0].phx_monthly_revenue_actual?.toString() || '0',
        phxMonthlyRevenueGoal: data[0].phx_monthly_revenue_goal?.toString() || '0'
      };
      
      // Fetch associated events for this meeting
      if (data[0].id) {
        const { data: eventsData, error: eventsError } = await supabase
          .from('association_events')
          .select('*')
          .eq('meeting_id', data[0].id)
          .order('event_date', { ascending: true });
        
        if (eventsError) {
          console.error('Error fetching association events:', eventsError);
        } else if (eventsData) {
          // Transform events data to match our interface
          newFormData.associationEvents = eventsData.map(event => ({
            id: event.id,
            title: event.title || '',
            date: event.event_date || '',
            location: event.location || '',
            assignee: event.assignee || ''
          }));
        }
        
        // Fetch property revenues for this meeting
        await fetchPropertyRevenues(data[0].id);
      }
      
      setFormData(newFormData);
      if (data[0].meeting_date) {
        setSelectedDate(new Date(data[0].meeting_date));
      }
      setCurrentMeetingId(data[0].id);
      
      setCachedFormData((prev: CachedFormData) => ({
        ...prev,
        [cacheKey]: {
          formData: newFormData,
          selectedDate: data[0].meeting_date ? new Date(data[0].meeting_date) : new Date(weekStartDate),
          currentMeetingId: data[0].id
        }
      }));
    } else {
      const weekDate = new Date(weekStartDate);
      const resetFormData: FormData = {
        attendees: '',
        safetyMessage: '',
        encoreValues: '',
        closingDeals: '',
        biddingDeals: '',
        hotProperties: '',
        terminationChanges: '',
        // New fields with empty values
        associationUpdate: '',
        associationEvents: [],
        lvMonthlyRevenueActual: '0',
        lvMonthlyRevenueGoal: '0',
        phxMonthlyRevenueActual: '0',
        phxMonthlyRevenueGoal: '0'
      };
      
      setFormData(resetFormData);
      setSelectedDate(weekDate);
      setCurrentMeetingId(null);
      
      setCachedFormData((prev: CachedFormData) => ({
        ...prev,
        [cacheKey]: {
          formData: resetFormData,
          selectedDate: weekDate,
          currentMeetingId: null
        }
      }));
    }
    
    setIsFormModified(false);
  } catch (error: any) {
    console.error('Error in fetchMeetingForWeek:', error);
    throw error;
  }
}, [supabase, cachedFormData]);

  // Fetch yearly goals data - Updated for regions
  const fetchYearlyGoals = async () => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('yearly_goals')
        .select('*')
        .eq('year', new Date().getFullYear());
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Initialize with default values
        const newYearlyGoals: {[key: string]: YearlyGoals} = {
          'Las Vegas': {
            id: null,
            year: new Date().getFullYear(),
            region: 'Las Vegas',
            revenueTarget: '1.25',
            revenueDescription: 'new maintenance',
            retentionGoal: '90',
            retentionDescription: 'customer retention',
            currentRevenue: '2.85',
            currentRetention: '97'
          },
          'Phoenix': {
            id: null,
            year: new Date().getFullYear(),
            region: 'Phoenix',
            revenueTarget: '2.75',
            revenueDescription: 'new maintenance',
            retentionGoal: '90',
            retentionDescription: 'customer retention',
            currentRevenue: '2.40',
            currentRetention: '97'
          }
        };
        
        // Update with values from database
        data.forEach(goal => {
          const region = goal.region || 'Las Vegas'; // Default to Las Vegas if region is not specified
          
          newYearlyGoals[region] = {
            id: goal.id,
            year: goal.year,
            region: region,
            revenueTarget: (goal.revenue_target / 1000000).toFixed(2),
            revenueDescription: goal.revenue_description,
            retentionGoal: goal.retention_goal.toString(),
            retentionDescription: goal.retention_description,
            currentRevenue: goal.current_revenue ? (goal.current_revenue / 1000000).toFixed(2) : '0',
            currentRetention: goal.current_retention ? goal.current_retention.toString() : '0'
          };
        });
        
        setYearlyGoals(newYearlyGoals);
      }
    } catch (error: any) {
      console.error('Error fetching yearly goals:', error);
      setTabErrors((prev: TabErrors) => ({
        ...prev,
        vto: {
          message: 'Failed to fetch yearly goals',
          details: error
        }
      }));
    }
  };

  // Fetch issues list data
  const fetchIssuesList = async () => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('issues_list')
        .select('*')
        .eq('week_start_date', selectedWeek)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const issuesData: Issue[] = data.map((issue: IssueRecord) => ({
          id: issue.id,
          issueText: issue.issue_text,
          isCompleted: issue.is_completed,
          assignedTo: issue.assigned_to || '',
          dueDate: issue.due_date ? new Date(issue.due_date) : null
        }));
        
        setIssuesList(issuesData);
      } else {
        // Keep default issues if none found
      }
    } catch (error: any) {
      console.error('Error fetching issues list:', error);
      setTabErrors((prev: TabErrors) => ({
        ...prev,
        vto: {
          message: 'Failed to fetch issues list',
          details: error
        }
      }));
    }
  };

  // Fetch quarterly rocks data
  const fetchQuarterlyRocks = async () => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('quarterly_rocks')
        .select('*')
        .eq('week_start_date', selectedWeek);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Process CRE Groups rock
        const creGroups = data.find((rock: QuarterlyRockRecord) => rock.category === 'CRE Groups');
        if (creGroups) {
          setQuarterlyRocks((prev: QuarterlyRocks) => ({
            ...prev,
            creGroups: {
              id: creGroups.id,
              title: creGroups.title || 'CRE Groups & Committees',
              assignedTo: creGroups.assigned_to || 'Andy & Jade',
              currentGroups: creGroups.current_groups || '',
              actionItems: creGroups.action_items || ''
            }
          }));
        }
        
        // Process Production rock
        const production = data.find((rock: QuarterlyRockRecord) => rock.category === 'Production');
        if (production) {
          setQuarterlyRocks((prev: QuarterlyRocks) => ({
            ...prev,
            productionRates: {
              id: production.id,
              title: production.title || 'Production Rates in Aspire',
              assignedTo: production.assigned_to || 'Mike',
              currentStatus: production.current_status || '',
              updatesNotes: production.updates_notes || ''
            }
          }));
        }
        
        // Process Events rock
        const events = data.find((rock: QuarterlyRockRecord) => rock.category === 'Events');
        if (events) {
          let puttingWorldEvent = '';
          let lvCharcuterieEvent = '';
          
          if (events.event_details) {
            try {
              const eventDetails = JSON.parse(events.event_details);
              if (Array.isArray(eventDetails) && eventDetails.length >= 2) {
                const putWorld = eventDetails[0];
                const lvChar = eventDetails[1];
                
                puttingWorldEvent = `Date: ${putWorld.date}\nLocation: ${putWorld.location}\nExpected Attendance: ${putWorld.attendance}\nBudget Status: ${putWorld.budget_status}\nKey Activities:\n${putWorld.activities.map((act: string) => `- ${act}`).join('\n')}`;
                
                lvCharcuterieEvent = `Date: ${lvChar.date}\nLocation: ${lvChar.location}\nExpected Attendance: ${lvChar.attendance}\nBudget Status: ${lvChar.budget_status}\nKey Activities:\n${lvChar.activities.map((act: string) => `- ${act}`).join('\n')}`;
              }
            } catch (e) {
              console.error('Error parsing event details JSON:', e);
            }
          }
          
          setQuarterlyRocks((prev: QuarterlyRocks) => ({
            ...prev,
            events: {
              id: events.id,
              title: events.title || 'Q3-4 Events Planning',
              assignedTo: events.assigned_to || 'Mike',
              puttingWorldEvent: puttingWorldEvent || prev.events.puttingWorldEvent,
              lvCharcuterieEvent: lvCharcuterieEvent || prev.events.lvCharcuterieEvent
            }
          }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching quarterly rocks:', error);
      setTabErrors((prev: TabErrors) => ({
        ...prev,
        vto: {
          message: 'Failed to fetch quarterly rocks',
          details: error
        }
      }));
    }
  };

  // Fetch presentations data
  const fetchPresentationsData = async () => {
    if (!supabase) return;
    
    try {
      // Fetch meeting guidelines
      const { data: guidelinesData, error: guidelinesError } = await supabase
        .from('meeting_guidelines')
        .select('*')
        .order('sort_order', { ascending: true });
        
      if (guidelinesError) throw guidelinesError;
      
      if (guidelinesData && guidelinesData.length > 0) {
        setMeetingGuidelines(guidelinesData.map((g: GuidelineRecord) => ({
          id: g.id,
          guidelineText: g.guideline_text,
          category: g.category,
          sortOrder: g.sort_order
        })));
      }
      
      // Fetch objection handling
      const { data: objectionData, error: objectionError } = await supabase
        .from('objection_handling')
        .select('*');
        
      if (objectionError) throw objectionError;
      
      if (objectionData && objectionData.length > 0) {
        setObjectionHandling(objectionData.map((o: ObjectionRecord) => ({
          id: o.id,
          objection: o.objection,
          rebuttal: o.rebuttal,
          thingsToSay: o.things_to_say,
          thingsNotToSay: o.things_not_to_say,
          isEditing: false // Added isEditing property
        })));
      }
      
      // Fetch quick tips
      const { data: tipsData, error: tipsError } = await supabase
        .from('quick_tips')
        .select('*');
        
      if (tipsError) throw tipsError;
      
      if (tipsData && tipsData.length > 0) {
        setQuickTips(tipsData.map((t: QuickTipRecord) => ({
          id: t.id,
          category: t.category,
          tipText: t.tip_text
        })));
      }
    } catch (error: any) {
      console.error('Error fetching presentations data:', error);
      setTabErrors((prev: TabErrors) => ({
        ...prev,
        presentations: {
          message: 'Failed to fetch presentations data',
          details: error
        }
      }));
    }
  };

  // Fetch memberships data - UPDATED with isEditing property
  const fetchMembershipsData = async () => {
    if (!supabase) return;
    
    try {
      // Removed the filter by week_start_date since this column doesn't exist
      const { data, error } = await supabase
        .from('association_memberships')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setMemberships(data.map((m: MembershipRecord) => ({
          id: m.id,
          salesRep: m.sales_rep,
          groups: m.groups || '',
          committees: m.committees || '',
          meetingSchedule: m.meeting_schedule || '',
          meetingsAttended: m.meetings_attended || 0,
          totalMeetings: m.total_meetings || 0,
          isEditing: false // Added isEditing property
        })));
      }
    } catch (error: any) {
      console.error('Error fetching memberships data:', error);
      setTabErrors((prev: TabErrors) => ({
        ...prev,
        memberships: {
          message: 'Failed to fetch memberships data',
          details: error
        }
      }));
    }
  };

  // Fetch targets data
  const fetchTargetsData = async () => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setTargets(data);
      }
    } catch (error: any) {
      console.error('Error fetching targets data:', error);
      setTabErrors((prev: TabErrors) => ({
        ...prev,
        targetList: {
          message: 'Failed to fetch targets data',
          details: error
        }
      }));
    }
  };

  // ========================
  // Event Handlers
  // ========================
  
  // Handle tab change
// Handle tab change
const handleTabChange = (value: string) => {
  if (value !== activeTab) {
    // If leaving the VTO tab, save any changes to metrics
    if (activeTab === "vto") {
      saveYearlyGoals();
    }
    
    // If leaving the Target List tab, save any changes
    if (activeTab === "targetList" && isTargetListModified) {
      console.log('Saving Target List data before tab change');
      saveData();
      setIsTargetListModified(false);
    }
    
    // Cache form data before changing tabs
    if (activeTab === "level10" && isFormModified) {
      const cacheKey = `level10_${selectedWeek}`;
      console.log('Saving form data to cache before tab change:', cacheKey, formData);
      setCachedFormData((prev: CachedFormData) => ({
        ...prev,
        [cacheKey]: {
          formData: { ...formData },
          selectedDate,
          currentMeetingId
        }
      }));
      setIsFormModified(false);
    }
    
    // Track visited tabs
    if (!visitedTabs.includes(value)) {
      setVisitedTabs((prev: string[]) => [...prev, value]);
    }
    
    setActiveTab(value);
  }
};

  // Handle week selection change
  const handleWeekChange = (value: string) => {
    if (activeTab === "level10" && isFormModified) {
      const cacheKey = `level10_${selectedWeek}`;
      console.log('Saving form data to cache before week change:', cacheKey, formData);
      setCachedFormData((prev: CachedFormData) => ({
        ...prev,
        [cacheKey]: {
          formData: { ...formData },
          selectedDate,
          currentMeetingId
        }
      }));
      setIsFormModified(false);
    }
    
    setSelectedWeek(value);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: FormData) => ({ ...prev, [name]: value }));
    setIsFormModified(true);
  };

// 5. Add this function to handle opening the detail modal
const handleShowDetails = (region: 'Las Vegas' | 'Phoenix') => {
  setActiveRegionDetails(region);
  setShowRevenueDetails(true);
};

// After your existing event handlers like handleInputChange, handleShowDetails, etc.
// but before the return statement

// Property revenue event handlers
const handlePropertyNameChange = (index: number, value: string) => {
  setPropertyRevenues((prev) => {
    const newData = { ...prev };
    if (activeRegionDetails) {
      newData[activeRegionDetails] = [...newData[activeRegionDetails]];
      newData[activeRegionDetails][index] = {
        ...newData[activeRegionDetails][index],
        name: value
      };
    }
    return newData;
  });
};





const handlePropertyEdit = (index: number) => {
  setPropertyRevenues((prev) => {
    const newData = { ...prev };
    if (activeRegionDetails) {
      newData[activeRegionDetails] = [...newData[activeRegionDetails]];
      newData[activeRegionDetails][index] = {
        ...newData[activeRegionDetails][index],
        isEditing: true,
        // Initialize the temp field with the current revenue
        tempRevenue: newData[activeRegionDetails][index].revenue.toString()
      };
    }
    return newData;
  });
};

// Update the handlePropertySave function to add console logging
const handlePropertySave = async (index: number) => {
  if (!supabase || !activeRegionDetails || !currentMeetingId) return;
  
  try {
    console.log('Saving property at index:', index);
    setSaveStatus('saving');
    
    // Get the current property from state
    const property = propertyRevenues[activeRegionDetails][index];
    
    // Try multiple approaches to get the current value to ensure we don't miss it
    let inputValue;
    
    // 1. Try the ref approach first
    if (revenueInputRefs.current[activeRegionDetails] && 
        revenueInputRefs.current[activeRegionDetails][index]) {
      inputValue = revenueInputRefs.current[activeRegionDetails][index].value;
      console.log('Got value from ref:', inputValue);
    } 
    // 2. Then try direct DOM query as fallback
    else {
      const inputElement = document.querySelector(`[data-property-index="${index}"]`);
      if (inputElement) {
        inputValue = inputElement.value;
        console.log('Got value from DOM:', inputValue);
      }
      // 3. Finally use the state value if all else fails
      else {
        inputValue = property.tempRevenue || property.revenue.toString();
        console.log('Using state value:', inputValue);
      }
    }
    
    // Parse the numeric value from input
    const numValue = parseFloat(inputValue.replace(/[^0-9.]/g, '')) || 0;
    console.log('Parsed numeric value:', numValue);
    
    const propertyData = {
      meeting_id: currentMeetingId,
      region: activeRegionDetails,
      property_name: property.name,
      revenue: numValue,
      month_date: new Date(selectedDate).toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };
    
    // Update in database
    if (property.id) {
      console.log('Updating existing property with ID:', property.id);
      const { error } = await supabase
        .from('property_revenues')
        .update(propertyData)
        .eq('id', property.id);
        
      if (error) throw error;
    } else {
      console.log('Inserting new property');
      const { data, error } = await supabase
        .from('property_revenues')
        .insert(propertyData)
        .select();
        
      if (error) throw error;
      
      // Update the ID if this was a new property
      if (data && data.length > 0) {
        setPropertyRevenues((prev) => {
          const newData = { ...prev };
          if (activeRegionDetails) {
            newData[activeRegionDetails] = [...newData[activeRegionDetails]];
            newData[activeRegionDetails][index] = {
              ...newData[activeRegionDetails][index],
              id: data[0].id
            };
          }
          return newData;
        });
      }
    }
    
    // Update the property in state with the parsed value and turn off edit mode
    setPropertyRevenues((prev) => {
      const newData = { ...prev };
      if (activeRegionDetails) {
        newData[activeRegionDetails] = [...newData[activeRegionDetails]];
        newData[activeRegionDetails][index] = {
          ...newData[activeRegionDetails][index],
          revenue: numValue,
          isEditing: false,
          tempRevenue: undefined // Clear temp value
        };
      }
      return newData;
    });
    
    // Update total revenue for the region
    const updatedProperties = [...propertyRevenues[activeRegionDetails]];
    updatedProperties[index].revenue = numValue;
    const totalRevenue = updatedProperties.reduce((sum, prop) => sum + prop.revenue, 0);
    
    setFormData(prev => ({
      ...prev,
      ...(activeRegionDetails === 'Las Vegas' 
        ? { lvMonthlyRevenueActual: totalRevenue.toString() }
        : { phxMonthlyRevenueActual: totalRevenue.toString() })
    }));
    
    setIsFormModified(true);
    setSaveStatus('success');
    console.log('Save completed successfully');
    setTimeout(() => setSaveStatus('idle'), 1500);
    
  } catch (error) {
    console.error('Error saving property:', error);
    setSaveStatus('error');
    setTimeout(() => setSaveStatus('idle'), 1500);
  }
};

// Add a new property function
const handleAddProperty = () => {
  if (!activeRegionDetails) return;
  
  setPropertyRevenues((prev) => {
    const newData = { ...prev };
    newData[activeRegionDetails] = [
      ...newData[activeRegionDetails],
      {
        id: null,
        name: "New Property",
        revenue: 0,
        tempRevenue: "0", // Initialize with a string value
        isEditing: true
      }
    ];
    return newData;
  });
};

// Delete a property function
const handleDeleteProperty = async (index: number) => {
  if (!supabase || !activeRegionDetails) return;
  
  const property = propertyRevenues[activeRegionDetails][index];
  
  try {
    setSaveStatus('saving');
    
    if (property.id) {
      // Delete from database if it exists
      const { error } = await supabase
        .from('property_revenues')
        .delete()
        .eq('id', property.id);
        
      if (error) throw error;
    }
    
    // Remove from state
    setPropertyRevenues((prev) => {
      const newData = { ...prev };
      if (activeRegionDetails) {
        newData[activeRegionDetails] = newData[activeRegionDetails].filter((_, i) => i !== index);
      }
      return newData;
    });
    

    
    // Update the total revenue
    const updatedProperties = [...propertyRevenues[activeRegionDetails]];
    updatedProperties.splice(index, 1);
    
    const newTotalRevenue = updatedProperties.reduce(
      (sum, property) => sum + property.revenue, 0
    );
    
    setFormData(prev => ({
      ...prev,
      ...(activeRegionDetails === 'Las Vegas' 
        ? { lvMonthlyRevenueActual: newTotalRevenue.toString() }
        : { phxMonthlyRevenueActual: newTotalRevenue.toString() })
    }));
    
    setIsFormModified(true);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 1500);
    
  } catch (error: any) {
    console.error('Error deleting property:', error);
    setSaveStatus('error');
    setTimeout(() => setSaveStatus('idle'), 1500);
  }
};




  // Handle yearly goals metrics update - Updated for regions
  const handleMetricsUpdate = (e?: React.FormEvent, region?: string) => {
    if (e) e.preventDefault();
    
    if (region) {
      // Update specific region
      console.log(`Updating metrics for ${region} with current state values:`, 
        yearlyGoals[region].currentRevenue, yearlyGoals[region].currentRetention);
      
      saveYearlyGoals(
        region,
        yearlyGoals[region].currentRevenue.toString().replace('M', ''),
        yearlyGoals[region].currentRetention.toString().replace('%', '')
      );
    } else {
      // Update all regions
      Object.keys(yearlyGoals).forEach(regionKey => {
        console.log(`Updating metrics for ${regionKey} with current state values:`, 
          yearlyGoals[regionKey].currentRevenue, yearlyGoals[regionKey].currentRetention);
        
        saveYearlyGoals(
          regionKey,
          yearlyGoals[regionKey].currentRevenue.toString().replace('M', ''),
          yearlyGoals[regionKey].currentRetention.toString().replace('%', '')
        );
      });
    }
  };

// Handle current revenue input change - Fixed dollar sign handling
const handleCurrentRevenueChange = (e: React.ChangeEvent<HTMLInputElement>, region: string) => {
  // Remove both $ and M from the input value
  const value = e.target.value.replace(/[$M]/g, '').trim();
  
  setYearlyGoals((prev) => ({
    ...prev,
    [region]: {
      ...prev[region],
      currentRevenue: value
    }
  }));
  
  console.log(`Current revenue for ${region} updated to:`, value);
};

  // Handle current retention input change - Updated for regions
  const handleCurrentRetentionChange = (e: React.ChangeEvent<HTMLInputElement>, region: string) => {
    const value = e.target.value.replace('%', '').trim();
    setYearlyGoals((prev) => ({
      ...prev,
      [region]: {
        ...prev[region],
        currentRetention: value
      }
    }));
    console.log(`Current retention for ${region} updated to:`, value);
  };

  // Handle target search
  const handleTargetSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };



  // ==============================================
  // Objection Handling Event Handlers
  // ==============================================
  
  // Toggle edit mode for an objection
  const handleObjectionEdit = (index: number) => {
    console.log('Editing objection at index:', index);
    setObjectionHandling((prev: Objection[]) => 
      prev.map((obj: Objection, i: number) => 
        i === index ? { ...obj, isEditing: true } : obj
      )
    );
  };

  // Update an objection field while editing
  const handleObjectionChange = (index: number, field: keyof Objection, value: string) => {
    setObjectionHandling((prev: Objection[]) => 
      prev.map((obj: Objection, i: number) => 
        i === index ? { ...obj, [field]: value } : obj
      )
    );
  };

  // Save an objection to state and Supabase
  const handleObjectionSave = async (objection: Objection, isNew = false) => {
    if (!supabase) {
      console.error('Cannot save objection - Supabase not initialized');
      return;
    }

    setSaveStatus('saving');
    
    try {
      const objectionData = {
        objection: objection.objection,
        rebuttal: objection.rebuttal,
        things_to_say: objection.thingsToSay,
        things_not_to_say: objection.thingsNotToSay,
        updated_at: new Date().toISOString()
      };
      
      // Define explicit type for the result variable and initialize as null
      let result: { data: any[] | null; error: any } | null = null;
      
      // If this is a new objection (no valid database ID)
      if (isNew || !objection.id || objection.id.toString().startsWith('temp-')) {
        console.log('Inserting new objection:', objectionData);
        result = await supabase
          .from('objection_handling')
          .insert(objectionData)
          .select();
          
        if (result && result.error) throw result.error;
        
        if (result && result.data && result.data.length > 0) {
          // Replace the temporary objection with the one that has a real ID from the database
          setObjectionHandling((prev: Objection[]) => 
            prev.map((obj: Objection) => 
              (obj.id === objection.id) ? 
              { 
                id: result!.data![0].id, 
                objection: result!.data![0].objection,
                rebuttal: result!.data![0].rebuttal,
                thingsToSay: result!.data![0].things_to_say,
                thingsNotToSay: result!.data![0].things_not_to_say,
                isEditing: false 
              } : obj
            )
          );
        }
      } else {
        // This is an existing objection
        console.log('Updating existing objection with ID:', objection.id);
        result = await supabase
          .from('objection_handling')
          .update(objectionData)
          .eq('id', objection.id)
          .select();
          
        if (result && result.error) throw result.error;
        
        // Turn off edit mode
        setObjectionHandling((prev: Objection[]) => 
          prev.map((obj: Objection) => 
            obj.id === objection.id ? { ...obj, isEditing: false } : obj
          )
        );
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1500);
      
    } catch (error: any) {
      console.error('Error saving objection:', error);
      setSaveStatus('error');
      setTabErrors((prev: TabErrors) => ({
        ...prev,
        presentations: {
          message: 'Failed to save objection',
          details: error
        }
      }));
      setTimeout(() => setSaveStatus('idle'), 1500);
    }
  };

  // Delete an objection from state and Supabase
  const handleObjectionDelete = async (index: number) => {
    if (!supabase) {
      console.error('Cannot delete objection - Supabase not initialized');
      return;
    }
    
    const objection = objectionHandling[index];
    
    setSaveStatus('saving');
    
    try {
      // If the objection has a valid database ID (not a temporary one)
      if (objection.id && !objection.id.toString().startsWith('temp-')) {
        console.log('Deleting objection with ID:', objection.id);
        const { error } = await supabase
          .from('objection_handling')
          .delete()
          .eq('id', objection.id);
          
        if (error) throw error;
      }
      
      // Remove from state regardless of whether it was in the database
      setObjectionHandling((prev: Objection[]) => prev.filter((_, i: number) => i !== index));
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1500);
      
    } catch (error: any) {
      console.error('Error deleting objection:', error);
      setSaveStatus('error');
      setTabErrors((prev: TabErrors) => ({
        ...prev,
        presentations: {
          message: 'Failed to delete objection',
          details: error
        }
      }));
      setTimeout(() => setSaveStatus('idle'), 1500);
    }
  };
  
  // ==============================================
  // Membership Event Handlers (New)
  // ==============================================
  
  // Toggle edit mode for a membership
  const handleMembershipEdit = (index: number) => {
    console.log('Editing membership at index:', index);
    setMemberships((prev: Membership[]) => 
      prev.map((mem: Membership, i: number) => 
        i === index ? { ...mem, isEditing: true } : mem
      )
    );
  };

  // Update a membership field while editing
  const handleMembershipChange = (index: number, field: keyof Membership, value: string | number) => {
    setMemberships((prev: Membership[]) => 
      prev.map((mem: Membership, i: number) => 
        i === index ? { ...mem, [field]: value } : mem
      )
    );
  };

  // Save a membership to state and Supabase
  const handleMembershipSave = async (membership: Membership, isNew = false) => {
    if (!supabase) {
      console.error('Cannot save membership - Supabase not initialized');
      return;
    }

    setSaveStatus('saving');
    
    try {
      const membershipData = {
        sales_rep: membership.salesRep,
        groups: membership.groups,
        committees: membership.committees,
        meeting_schedule: membership.meetingSchedule,
        meetings_attended: membership.meetingsAttended,
        total_meetings: membership.totalMeetings,
        updated_at: new Date().toISOString()
      };
      
      // Define explicit type for the result variable and initialize as null
      let result: { data: any[] | null; error: any } | null = null;
      
      // If this is a new membership (no valid database ID)
      if (isNew || !membership.id || membership.id.toString().startsWith('temp-')) {
        console.log('Inserting new membership:', membershipData);
        result = await supabase
          .from('association_memberships')
          .insert(membershipData)
          .select();
          
        if (result && result.error) throw result.error;
        
        if (result && result.data && result.data.length > 0) {
          // Replace the temporary membership with the one that has a real ID from the database
          setMemberships((prev: Membership[]) => 
            prev.map((mem: Membership) => 
              (mem.id === membership.id) ? 
              { 
                id: result!.data![0].id, 
                salesRep: result!.data![0].sales_rep,
                groups: result!.data![0].groups || '',
                committees: result!.data![0].committees || '',
                meetingSchedule: result!.data![0].meeting_schedule || '',
                meetingsAttended: result!.data![0].meetings_attended || 0,
                totalMeetings: result!.data![0].total_meetings || 0,
                isEditing: false 
              } : mem
            )
          );
        }
      } else {
        // This is an existing membership
        console.log('Updating existing membership with ID:', membership.id);
        result = await supabase
          .from('association_memberships')
          .update(membershipData)
          .eq('id', membership.id)
          .select();
          
        if (result && result.error) throw result.error;
        
        // Turn off edit mode
        setMemberships((prev: Membership[]) => 
          prev.map((mem: Membership) => 
            mem.id === membership.id ? { ...mem, isEditing: false } : mem
          )
        );
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1500);
      
    } catch (error: any) {
      console.error('Error saving membership:', error);
      setSaveStatus('error');
      setTabErrors((prev: TabErrors) => ({
        ...prev,
        memberships: {
          message: 'Failed to save membership',
          details: error
        }
      }));
      setTimeout(() => setSaveStatus('idle'), 1500);
    }
  };

  // Delete a membership from state and Supabase
  const handleMembershipDelete = async (index: number) => {
    if (!supabase) {
      console.error('Cannot delete membership - Supabase not initialized');
      return;
    }
    
    const membership = memberships[index];
    
    setSaveStatus('saving');
    
    try {
      // If the membership has a valid database ID (not a temporary one)
      if (membership.id && !membership.id.toString().startsWith('temp-')) {
        console.log('Deleting membership with ID:', membership.id);
        const { error } = await supabase
          .from('association_memberships')
          .delete()
          .eq('id', membership.id);
          
        if (error) throw error;
      }
      
      // Remove from state regardless of whether it was in the database
      setMemberships((prev: Membership[]) => prev.filter((_, i: number) => i !== index));
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1500);
      
    } catch (error: any) {
      console.error('Error deleting membership:', error);
      setSaveStatus('error');
      setTabErrors((prev: TabErrors) => ({
        ...prev,
        memberships: {
          message: 'Failed to delete membership',
          details: error
        }
      }));
      setTimeout(() => setSaveStatus('idle'), 1500);
    }
  };

  // ========================
  // Save Functions
  // ========================
  
// Main save function
const saveData = async () => {
  if (!supabase) {
    setConnectionError('Supabase client is not initialized. Cannot save data.');
    return;
  }
  
  setIsSaving(true);
  setSaveStatus('saving');
  
  try {
    console.log(`Saving data for ${activeTab} tab for week: ${selectedWeek}`);
    
    if (activeTab === "level10") {
      // Save Level 10 meeting data
      const meetingData = {
        meeting_date: selectedDate?.toISOString(),
        week_start_date: selectedWeek,
        attendees: formData.attendees,
        safety_message: formData.safetyMessage,
        encore_values: formData.encoreValues,
        closing_deals: formData.closingDeals,
        bidding_deals: formData.biddingDeals,
        hot_properties: formData.hotProperties || '',
        termination_changes: formData.terminationChanges || '',
        association_update: formData.associationUpdate || '', // Add this line
        lv_monthly_revenue_actual: parseFloat(formData.lvMonthlyRevenueActual) || 0,
        lv_monthly_revenue_goal: parseFloat(formData.lvMonthlyRevenueGoal) || 0,
        phx_monthly_revenue_actual: parseFloat(formData.phxMonthlyRevenueActual) || 0,
        phx_monthly_revenue_goal: parseFloat(formData.phxMonthlyRevenueGoal) || 0,
        updated_at: new Date().toISOString()
      };
      
      console.log('Saving Level 10 meeting data:', meetingData);
      // Define explicit type for the result variable and initialize as null
      let result: { data: any[] | null; error: any } | null = null;
      
      if (currentMeetingId) {
        console.log('Updating existing meeting with ID:', currentMeetingId);
        result = await supabase
          .from('level10_meetings')
          .update(meetingData)
          .eq('id', currentMeetingId)
          .select();
      } else {
        console.log('Creating new meeting for week:', selectedWeek);
        result = await supabase
          .from('level10_meetings')
          .insert(meetingData)
          .select();
      }
      
      if (!result) {
        throw new Error('No result received from database operation');
      }
      
      const { data, error } = result;
      if (error) {
        console.error('Error saving Level 10 meeting to Supabase:', error);
        throw error;
      }
      
// In your saveData function, after saving meeting data
if (data && data.length > 0) {
  const meetingId = data[0].id;
  setCurrentMeetingId(meetingId);
  
  // Update all property revenues to link to this meeting
  for (const region of Object.keys(propertyRevenues)) {
    for (const property of propertyRevenues[region]) {
      const propertyData = {
        meeting_id: meetingId,
        region: region,
        property_name: property.name,
        revenue: property.revenue,
        month_date: new Date(selectedDate).toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };
      
      if (property.id) {
        // Update existing
        await supabase
          .from('property_revenues')
          .update(propertyData)
          .eq('id', property.id);
      } else {
        // Insert new
        await supabase
          .from('property_revenues')
          .insert(propertyData);
      }
    }
  }
}

      // Now save association events if we have a meeting ID
      if (data && data.length > 0) {
        const meetingId = data[0].id;
        
        // First, get existing events for this meeting to determine what to update/delete
        const { data: existingEvents, error: fetchError } = await supabase
          .from('association_events')
          .select('id')
          .eq('meeting_id', meetingId);
          
        if (fetchError) {
          console.error('Error fetching existing association events:', fetchError);
          throw fetchError;
        }
        
        // Get IDs of existing events
        const existingIds = new Set((existingEvents || []).map(e => e.id));
        const currentIds = new Set(formData.associationEvents.filter(e => e.id).map(e => e.id));
        
        // Find events to delete (in existing but not in current)
        const idsToDelete = [...existingIds].filter(id => !currentIds.has(id));
        
        // Delete events that no longer exist
        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('association_events')
            .delete()
            .in('id', idsToDelete);
            
          if (deleteError) {
            console.error('Error deleting association events:', deleteError);
            throw deleteError;
          }
        }
        
        // Process each event
        for (const event of formData.associationEvents) {
          if (event.id) {
            // Update existing event
            const { error: updateError } = await supabase
              .from('association_events')
              .update({
                title: event.title,
                event_date: event.date || null,
                location: event.location || null,
                assignee: event.assignee || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', event.id);
              
            if (updateError) {
              console.error(`Error updating association event ${event.id}:`, updateError);
              throw updateError;
            }
          } else {
            // Create new event
            const { error: insertError } = await supabase
              .from('association_events')
              .insert({
                meeting_id: meetingId,
                title: event.title,
                event_date: event.date || null,
                location: event.location || null,
                assignee: event.assignee || null
              });
              
            if (insertError) {
              console.error('Error inserting association event:', insertError);
              throw insertError;
            }
          }
        }
        
        console.log('Level 10 meeting save successful, response:', data);
        setCurrentMeetingId(data[0].id);
        const saveTime = new Date().getTime();
        window.localStorage.setItem('lastSaveTime', saveTime.toString());
        
        const cacheKey = `level10_${selectedWeek}`;
        setCachedFormData((prev: CachedFormData) => ({
          ...prev,
          [cacheKey]: {
            formData: { ...formData },
            selectedDate,
            currentMeetingId: data[0].id
          }
        }));
        
        setIsFormModified(false);
      }
    } else if (activeTab === "vto") {
      try {
        // Save yearly goals for all regions
        for (const regionKey of Object.keys(yearlyGoals)) {
          const region = yearlyGoals[regionKey];
          
          const yearlyGoalsData = {
            year: region.year,
            region: region.region,
            revenue_target: parseFloat(region.revenueTarget) * 1000000,
            revenue_description: region.revenueDescription,
            retention_goal: parseFloat(region.retentionGoal),
            retention_description: region.retentionDescription,
            current_revenue: parseFloat(region.currentRevenue) * 1000000,
            current_retention: parseFloat(region.currentRetention),
            updated_at: new Date().toISOString()
          };
          
          console.log(`Saving yearly goals data for ${region.region}:`, yearlyGoalsData);
          let yearlyGoalsResult;
          
          if (region.id) {
            yearlyGoalsResult = await supabase
              .from('yearly_goals')
              .update(yearlyGoalsData)
              .eq('id', region.id)
              .select();
          } else {
            yearlyGoalsResult = await supabase
              .from('yearly_goals')
              .insert(yearlyGoalsData)
              .select();
          }
          
          if (yearlyGoalsResult.error) {
            console.error(`Error saving yearly goals for ${region.region}:`, yearlyGoalsResult.error);
            throw yearlyGoalsResult.error;
          }
          
          if (yearlyGoalsResult.data && yearlyGoalsResult.data.length > 0) {
            setYearlyGoals((prev) => ({
              ...prev,
              [region.region]: { 
                ...prev[region.region], 
                id: yearlyGoalsResult.data[0].id 
              }
            }));
          }
        }
        
        // Save issues list
        console.log('Saving issues list data:', issuesList);
        for (const issue of issuesList) {
          const issueData = {
            issue_text: issue.issueText,
            is_completed: issue.isCompleted,
            assigned_to: issue.assignedTo,
            due_date: issue.dueDate?.toISOString().split('T')[0],
            week_start_date: selectedWeek,
            updated_at: new Date().toISOString()
          };
          
          if (issue.id) {
            const { error } = await supabase
              .from('issues_list')
              .update(issueData)
              .eq('id', issue.id);
              
            if (error) {
              console.error('Error updating issue:', error);
              throw error;
            }
          } else {
            const { data, error } = await supabase
              .from('issues_list')
              .insert(issueData)
              .select();
              
            if (error) {
              console.error('Error inserting issue:', error);
              throw error;
            }
            
            if (data && data.length > 0) {
              setIssuesList((prev: Issue[]) => 
                prev.map((i: Issue) => 
                  i.issueText === issue.issueText && i.id === null
                    ? { ...i, id: data[0].id }
                    : i
                )
              );
            }
          }
        }
        
        // Save CRE Groups rock
        const creGroupsData = {
          title: quarterlyRocks.creGroups.title,  // Now editable
          category: 'CRE Groups',
          assigned_to: quarterlyRocks.creGroups.assignedTo,  // Now editable
          current_groups: quarterlyRocks.creGroups.currentGroups,
          action_items: quarterlyRocks.creGroups.actionItems,
          week_start_date: selectedWeek,
          updated_at: new Date().toISOString()
        };
        
        console.log('Saving CRE Groups data:', creGroupsData);
        if (quarterlyRocks.creGroups.id) {
          const { error } = await supabase
            .from('quarterly_rocks')
            .update(creGroupsData)
            .eq('id', quarterlyRocks.creGroups.id);
            
          if (error) {
            console.error('Error updating CRE Groups:', error);
            throw error;
          }
        } else {
          const { data, error } = await supabase
            .from('quarterly_rocks')
            .insert(creGroupsData)
            .select();
            
          if (error) {
            console.error('Error inserting CRE Groups:', error);
            throw error;
          }
          
          if (data && data.length > 0) {
            setQuarterlyRocks((prev: QuarterlyRocks) => ({
              ...prev,
              creGroups: { ...prev.creGroups, id: data[0].id }
            }));
          }
        }
        
        // Save Production Rates rock
        const productionRatesData = {
          title: quarterlyRocks.productionRates.title,  // Now editable
          category: 'Production',
          assigned_to: quarterlyRocks.productionRates.assignedTo,  // Now editable
          current_status: quarterlyRocks.productionRates.currentStatus,
          updates_notes: quarterlyRocks.productionRates.updatesNotes,
          week_start_date: selectedWeek,
          updated_at: new Date().toISOString()
        };
        
        console.log('Saving Production Rates data:', productionRatesData);
        if (quarterlyRocks.productionRates.id) {
          const { error } = await supabase
            .from('quarterly_rocks')
            .update(productionRatesData)
            .eq('id', quarterlyRocks.productionRates.id);
            
          if (error) {
            console.error('Error updating Production Rates:', error);
            throw error;
          }
        } else {
          const { data, error } = await supabase
            .from('quarterly_rocks')
            .insert(productionRatesData)
            .select();
            
          if (error) {
            console.error('Error inserting Production Rates:', error);
            throw error;
          }
          
          if (data && data.length > 0) {
            setQuarterlyRocks((prev: QuarterlyRocks) => ({
              ...prev,
              productionRates: { ...prev.productionRates, id: data[0].id }
            }));
          }
        }
        
        // Parse Events data from text areas
        const puttingWorld: {
          name: string;
          date: string;
          location: string;
          attendance: number;
          budget_status: string;
          activities: string[];
        } = { 
          name: "Putting World Event", 
          date: "", 
          location: "", 
          attendance: 0, 
          budget_status: "", 
          activities: [] 
        };
        
        const lvCharcuterie: {
          name: string;
          date: string;
          location: string;
          attendance: number;
          budget_status: string;
          activities: string[];
        } = { 
          name: "LV Charcuterie Event", 
          date: "", 
          location: "", 
          attendance: 0, 
          budget_status: "", 
          activities: [] 
        };
        
        const puttingWorldLines = quarterlyRocks.events.puttingWorldEvent.split('\n');
        puttingWorldLines.forEach((line: string) => {
          if (line.startsWith('Date:')) puttingWorld.date = line.replace('Date:', '').trim();
          else if (line.startsWith('Location:')) puttingWorld.location = line.replace('Location:', '').trim();
          else if (line.startsWith('Expected Attendance:')) puttingWorld.attendance = parseInt(line.replace('Expected Attendance:', '').trim()) || 0;
          else if (line.startsWith('Budget Status:')) puttingWorld.budget_status = line.replace('Budget Status:', '').trim();
          else if (line.startsWith('- ')) puttingWorld.activities.push(line.replace('- ', '').trim());
        });
        
        const lvCharcuterieLines = quarterlyRocks.events.lvCharcuterieEvent.split('\n');
        lvCharcuterieLines.forEach((line: string) => {
          if (line.startsWith('Date:')) lvCharcuterie.date = line.replace('Date:', '').trim();
          else if (line.startsWith('Location:')) lvCharcuterie.location = line.replace('Location:', '').trim();
          else if (line.startsWith('Expected Attendance:')) lvCharcuterie.attendance = parseInt(line.replace('Expected Attendance:', '').trim()) || 0;
          else if (line.startsWith('Budget Status:')) lvCharcuterie.budget_status = line.replace('Budget Status:', '').trim();
          else if (line.startsWith('- ')) lvCharcuterie.activities.push(line.replace('- ', '').trim());
        });
        
        // Save Events rock
        const eventsData = {
          title: quarterlyRocks.events.title,  // Now editable
          category: 'Events',
          assigned_to: quarterlyRocks.events.assignedTo,  // Now editable
          event_details: JSON.stringify([puttingWorld, lvCharcuterie]),
          week_start_date: selectedWeek,
          updated_at: new Date().toISOString()
        };
        
        console.log('Saving Events data:', eventsData);
        if (quarterlyRocks.events.id) {
          const { error } = await supabase
            .from('quarterly_rocks')
            .update(eventsData)
            .eq('id', quarterlyRocks.events.id);
            
          if (error) {
            console.error('Error updating Events:', error);
            throw error;
          }
        } else {
          const { data, error } = await supabase
            .from('quarterly_rocks')
            .insert(eventsData)
            .select();
            
          if (error) {
            console.error('Error inserting Events:', error);
            throw error;
          }
          
          if (data && data.length > 0) {
            setQuarterlyRocks((prev: QuarterlyRocks) => ({
              ...prev,
              events: { ...prev.events, id: data[0].id }
            }));
          }
        }
      } catch (vtoError: any) {
        console.error('Error saving VTO data:', vtoError);
        throw vtoError;
      }
    } else if (activeTab === "presentations") {
      // Presentations tab save logic here (omitted for brevity)
    } else if (activeTab === "memberships") {
      // Memberships tab save logic here (omitted for brevity)
    } else if (activeTab === "targetList") {
      // Actually implement target list saving logic
      console.log('Saving Target List data...');
      
      try {
        // Get all existing target IDs from the database
        const { data: existingTargets, error: fetchError } = await supabase
          .from('targets')
          .select('id')
          .eq('status', 'active');
          
        if (fetchError) throw fetchError;
        
        // Create sets of IDs for comparison
        const existingIds = new Set(existingTargets?.map(t => t.id) || []);
        const currentIds = new Set(
          targets
            .filter(t => !t.id.includes('-')) // Only consider targets with real database IDs
            .map(t => t.id)
        );
        
        // Find targets to mark as inactive (deleted)
        const targetsToDeactivate = [...existingIds].filter(id => !currentIds.has(id));
        
        console.log('Found', targetsToDeactivate.length, 'targets to deactivate');
        
        // Mark deleted targets as inactive
        if (targetsToDeactivate.length > 0) {
          console.log('Marking targets as inactive:', targetsToDeactivate);
          for (const id of targetsToDeactivate) {
            const { error: deactivateError } = await supabase
              .from('targets')
              .update({ 
                status: 'inactive',
                updated_at: new Date().toISOString() 
              })
              .eq('id', id);
              
            if (deactivateError) {
              console.error(`Error deactivating target ${id}:`, deactivateError);
              throw deactivateError;
            }
          }
        }
        
        // Only handle new targets (with temp IDs) - don't touch existing ones
        // This prevents duplication
        const newTargets = targets.filter(t => t.id.includes('-'));
        console.log('Found', newTargets.length, 'new targets to insert');
        
        // Insert new targets only
        if (newTargets.length > 0) {
          const targetsToInsert = newTargets.map(t => ({
            company: t.company,
            contact_name: t.contact_name,
            contact_title: t.contact_title || '',
            contact_email: t.contact_email || '',
            properties: t.properties || '',
            sales_rep: t.sales_rep || '',
            sales_rep_name: t.sales_rep_name || '',
            notes: t.notes || '',
            projected_value: t.projected_value || '0',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          const { error: insertError } = await supabase
            .from('targets')
            .insert(targetsToInsert);
            
          if (insertError) {
            console.error('Error inserting new targets:', insertError);
            throw insertError;
          }
        }
        
        // Reset the modified flag after successful save
        setIsTargetListModified(false);
        
        // After saving, force a fresh fetch of target data to get DB-assigned IDs
        await fetchTargetsData();
        
      } catch (targetError: any) {
        console.error('Error saving Target List data:', targetError);
        throw targetError;
      }
    }
    
    console.log(`Successfully saved ${activeTab} data`);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 3000);
  } catch (error: any) {
    console.error('Error saving data:', error);
    
    // Extract more detailed error information
    let errorDetails = '';
    if (error) {
      if (error.message) {
        errorDetails = error.message;
      } else if (error.details) {
        errorDetails = typeof error.details === 'string' ? error.details : JSON.stringify(error.details);
      } else if (error.code) {
        errorDetails = `Error code: ${error.code}`;
      } else if (typeof error === 'object') {
        errorDetails = JSON.stringify(error);
      } else {
        errorDetails = String(error);
      }
    }
    
    // If we've got an empty object as a string, provide more context
    if (errorDetails === '{}') {
      errorDetails = 'Empty error object returned from Supabase. Check your database permissions and schema.';
    }
    
    setSaveStatus('error');
    setTabErrors((prev: TabErrors) => ({
      ...prev,
      [activeTab]: {
        message: `Failed to save ${activeTab} data: ${errorDetails}`,
        details: error
      }
    }));
    setTimeout(() => setSaveStatus('idle'), 3000);
  } finally {
    setIsSaving(false);
  }
};

  // Save yearly goals separately - Updated for regions
  const saveYearlyGoals = async (region?: string, currentRevenueStr?: string, currentRetentionStr?: string) => {
    if (!supabase) return;
    
    setSaveStatus('saving');
    
    try {
      if (region) {
        // Save for specific region
        // Use parameters if provided, otherwise use state values
        const revenueToSave = currentRevenueStr || yearlyGoals[region].currentRevenue;
        const retentionToSave = currentRetentionStr || yearlyGoals[region].currentRetention;
        console.log(`Saving yearly goals for ${region} with metrics:`, revenueToSave, retentionToSave);
        
        const yearlyGoalsData = {
          year: yearlyGoals[region].year,
          region: region,
          revenue_target: parseFloat(yearlyGoals[region].revenueTarget) * 1000000,
          revenue_description: yearlyGoals[region].revenueDescription,
          retention_goal: parseFloat(yearlyGoals[region].retentionGoal),
          retention_description: yearlyGoals[region].retentionDescription,
          current_revenue: parseFloat(revenueToSave) * 1000000,
          current_retention: parseFloat(retentionToSave),
          updated_at: new Date().toISOString()
        };
        
        console.log(`Saving yearly goals data for ${region}:`, yearlyGoalsData);
        // Define explicit type for the result variable and initialize as null
        let result: { data: any[] | null; error: any } | null = null;
        
        if (yearlyGoals[region].id) {
          console.log(`Updating existing yearly goals for ${region} with ID:`, yearlyGoals[region].id);
          result = await supabase
            .from('yearly_goals')
            .update(yearlyGoalsData)
            .eq('id', yearlyGoals[region].id)
            .select();
        } else {
          console.log(`Creating new yearly goals entry for ${region}`);
          result = await supabase
            .from('yearly_goals')
            .insert(yearlyGoalsData)
            .select();
        }
        
        if (result && result.error) {
          console.error(`Error saving yearly goals for ${region}:`, result.error);
          throw result.error;
        }
        
        console.log(`Yearly goals save successful for ${region}, response:`, result?.data);
        if (result && result.data && result.data.length > 0) {
          console.log(`Updating state with new yearly goals ID for ${region}`);
          setYearlyGoals((prev) => ({
            ...prev,
            [region]: {
              ...prev[region],
              id: result!.data![0].id,
              currentRevenue: revenueToSave,
              currentRetention: retentionToSave
            }
          }));
        }
      } else {
        // Save for all regions if no specific region provided
        for (const regionKey of Object.keys(yearlyGoals)) {
          await saveYearlyGoals(
            regionKey, 
            yearlyGoals[regionKey].currentRevenue, 
            yearlyGoals[regionKey].currentRetention
          );
        }
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (error: any) {
      console.error('Error saving yearly goals:', error);
      setSaveStatus('error');
      setTabErrors((prev: TabErrors) => ({
        ...prev,
        vto: {
          message: 'Failed to save yearly goals',
          details: error
        }
      }));
      setTimeout(() => setSaveStatus('idle'), 1500);
    }
  };



// Save target (for immediate updates to the targets list)
const saveTarget = async (updateFn: (targets: Target[]) => Target[]) => {
  try {
    if (!supabase) {
      setConnectionError('Supabase client is not initialized. Cannot save target.');
      return;
    }
    
    setSaveStatus('saving');
    
    // First, apply the update to the local state
    const updatedTargets = updateFn([...targets]);
    setTargets(updatedTargets);
    
    // Mark the target list as modified
    setIsTargetListModified(true);
    
    // Find what changed (new, updated, or deleted targets)
    const originalIds = new Set(targets.map(t => t.id));
    const updatedIds = new Set(updatedTargets.map(t => t.id));
    
    // Targets to add (in updated but not in original)
    const targetsToAdd = updatedTargets.filter(t => !originalIds.has(t.id));
    
    // Targets to remove (in original but not in updated)
    const targetsToRemove = targets.filter(t => !updatedIds.has(t.id));
    
    // Targets that may have been updated (same ID in both sets)
    const targetsToUpdate = updatedTargets.filter(t => 
      originalIds.has(t.id) && 
      targets.some(origT => 
        origT.id === t.id && 
        (origT.company !== t.company ||
         origT.contact_name !== t.contact_name ||
         origT.contact_title !== t.contact_title ||
         origT.contact_email !== t.contact_email ||
         origT.properties !== t.properties ||
         origT.sales_rep !== t.sales_rep ||
         origT.sales_rep_name !== t.sales_rep_name ||
         origT.notes !== t.notes ||
         origT.projected_value !== t.projected_value)
      )
    );
    
    // Log what's happening for debugging
    console.log('Targets to add:', targetsToAdd.length);
    console.log('Targets to update:', targetsToUpdate.length);
    console.log('Targets to remove:', targetsToRemove.length);
    
    // Process each type of change
    
    // Add new targets
    if (targetsToAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('targets')
        .insert(targetsToAdd.map(t => ({
          id: t.id.includes('-') ? undefined : t.id, // Skip ID if it's a timestamp ID
          company: t.company,
          contact_name: t.contact_name,
          contact_title: t.contact_title || '',
          contact_email: t.contact_email || '',
          properties: t.properties || '',
          sales_rep: t.sales_rep || '',
          sales_rep_name: t.sales_rep_name || '',
          notes: t.notes || '',
          projected_value: t.projected_value || '0',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })));
      
      if (insertError) {
        console.error('Error adding targets:', insertError);
        throw insertError;
      }
    }
    
    // Update existing targets
    for (const target of targetsToUpdate) {
      const { error: updateError } = await supabase
        .from('targets')
        .update({
          company: target.company,
          contact_name: target.contact_name,
          contact_title: target.contact_title || '',
          contact_email: target.contact_email || '',
          properties: target.properties || '',
          sales_rep: target.sales_rep || '',
          sales_rep_name: target.sales_rep_name || '',
          notes: target.notes || '',
          projected_value: target.projected_value || '0',
          updated_at: new Date().toISOString()
        })
        .eq('id', target.id);
      
      if (updateError) {
        console.error(`Error updating target ${target.id}:`, updateError);
        throw updateError;
      }
    }
    
    // Remove targets (mark as inactive rather than deleting)
    for (const target of targetsToRemove) {
      // Only delete if it's a real database record (not a temporary one)
      if (!target.id.includes('-')) {
        console.log(`Marking target as inactive: ${target.id}`);
        const { error: deleteError } = await supabase
          .from('targets')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', target.id);
        
        if (deleteError) {
          console.error(`Error removing target ${target.id}:`, deleteError);
          throw deleteError;
        }
      } else {
        console.log(`Skipping temporary target deletion: ${target.id}`);
      }
    }
    
    console.log('Target(s) saved successfully');
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
    
  } catch (error: any) {
    console.error('Error saving target:', error);
    setSaveStatus('error');
    setTabErrors((prev: TabErrors) => ({
      ...prev,
      targetList: {
        message: 'Failed to save target',
        details: error
      }
    }));
    
    // Don't automatically fetch data on error as it might overwrite unsaved changes
    // Instead, we'll keep the current state and let the user try again
    
    setTimeout(() => setSaveStatus('idle'), 2000);
  }
};
  
  // ========================
  // Effects
  // ========================
  
  // Fetch data when tab or week changes
  useEffect(() => {
    if (connectionError) return;
    
    if (activeTab === "level10") {
      const cacheKey = `level10_${selectedWeek}`;
      const cachedData = cachedFormData[cacheKey];
      
      if (cachedData) {
        console.log('Loading from cache:', cacheKey);
        setFormData(cachedData.formData);
        setSelectedDate(cachedData.selectedDate);
        setCurrentMeetingId(cachedData.currentMeetingId);
        setIsFormModified(false);
      } else {
        console.log('No cache found, fetching from database');
        fetchMeetingForWeek(selectedWeek);
      }
    } else {
      fetchData();
    }
  }, [activeTab, selectedWeek, connectionError, fetchData, fetchMeetingForWeek, cachedFormData]);

// Filter targets based on search
const filteredTargets = targets
  .filter((target: Target) => {
    return searchQuery === '' || 
      target.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      target.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      target.properties?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      target.notes?.toLowerCase().includes(searchQuery.toLowerCase());
  })
  // Add this sort function to sort alphabetically by company name
  .sort((a: Target, b: Target) => {
    return (a.company || '').localeCompare(b.company || '');
  });
// ========================
  // Render Component - Part 3
  // ========================
// Add this right before the return ( in your component
const RevenueDetailsModal = () => {
  if (!showRevenueDetails || !activeRegionDetails) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-blue-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {activeRegionDetails} Revenue Details
          </h3>
          <button 
            onClick={() => setShowRevenueDetails(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Total Monthly Revenue:</span>
              <span className="font-bold text-lg text-green-700">
                ${formatNumberWithCommas(
                  activeRegionDetails === 'Las Vegas' 
                    ? formData.lvMonthlyRevenueActual 
                    : formData.phxMonthlyRevenueActual
                )}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Goal: ${formatNumberWithCommas(
                activeRegionDetails === 'Las Vegas' 
                  ? formData.lvMonthlyRevenueGoal 
                  : formData.phxMonthlyRevenueGoal
              )}
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
  <div className="flex justify-between items-center mb-2">
    <h4 className="font-medium">Property Breakdown</h4>
    <Button 
      variant="outline" 
      size="sm"
      className="text-blue-600 text-xs"
      onClick={handleAddProperty}
    >
      + Add Property
    </Button>
  </div>
  <div className="max-h-64 overflow-y-auto pr-2">
    <table className="w-full">
              <thead className="bg-gray-50">
  <tr>
    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
    <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
    <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
  </tr>
</thead>
                <tbody className="divide-y divide-gray-200">
  {propertyRevenues[activeRegionDetails].map((property, index) => (
    <tr key={index} className="hover:bg-gray-50">
      <td className="py-2 px-3 text-sm">
        {property.isEditing ? (
          <Input
            value={property.name}
            onChange={(e) => handlePropertyNameChange(index, e.target.value)}
            className="border border-blue-200 p-1 w-full"
          />
        ) : (
          property.name
        )}
      </td>
      <td className="py-2 px-3 text-sm text-right">
  {property.isEditing ? (
    <input
      type="text"
      data-property-index={index}
      defaultValue={property.tempRevenue !== undefined ? property.tempRevenue : property.revenue.toString()}
      className="border border-blue-200 p-1 w-32 text-right"
      style={{ width: "100px" }}
      autoFocus
    />
  ) : (
    `${formatNumberWithCommas(property.revenue.toString())}`
  )}
</td>
      <td className="py-2 px-3 text-sm">
        {property.isEditing ? (
          <Button 
            variant="outline" 
            size="sm"
            className="border-green-500 text-green-600"
            onClick={() => handlePropertySave(index)}
          >
            Save
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handlePropertyEdit(index)}
          >
            Edit
          </Button>
        )}
      </td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-3 flex justify-end">
          <button
            onClick={() => setShowRevenueDetails(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">BD Meeting Agenda</h1>
          </div>
          {!connectionError && (
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex items-center border border-gray-200 rounded-md p-2 bg-white">
                  <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                  <select 
                    className="outline-none border-none bg-transparent pr-8 text-sm font-medium"
                    value={selectedWeek} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleWeekChange(e.target.value)}
                  >
                    {weekOptions.map((option: WeekOption) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <SaveButton 
                onClick={saveData}
                status={saveStatus}
                disabled={isSaving}
              />
            </div>
          )}
        </div>

        {connectionError ? (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-red-200">
            <div className="flex items-center text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <h2 className="text-xl font-bold">Connection Error</h2>
            </div>
            <p className="mb-4">{connectionError}</p>
            <div className="bg-red-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium mb-2">Troubleshooting Steps:</h3>
              {connectionError?.includes('API key') ? (
                <div>
                  <p className="text-red-800 font-medium mb-2">API Key Issue Detected</p>
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>Go to your Supabase project dashboard</li>
                    <li>Navigate to Project Settings {'>'} API</li>
                    <li>Copy the "anon" public key (not the service_role key)</li>
                    <li>Update your .env.local file with the correct key</li>
                    <li>Restart your Next.js development server</li>
                  </ol>
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Make sure your .env.local file contains:
                      <pre className="mt-1 bg-gray-100 p-2 rounded overflow-x-auto">
                        NEXT_PUBLIC_SUPABASE_URL=your_project_url<br/>
                        NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
                      </pre>
                    </p>
                    <p className="text-sm text-yellow-800 mt-2">
                      After updating, you must restart your Next.js server.
                    </p>
                  </div>
                </div>
              ) : connectionError?.includes('tables do not exist') ? (
                <div>
                  <p className="text-red-800 font-medium mb-2">Database Tables Missing</p>
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>It appears your database tables are not set up yet</li>
                    <li>Click the "Create Database Tables" button below to automatically set up the required tables</li>
                    <li>Alternatively, go to the Supabase SQL Editor and run the SQL setup script manually</li>
                  </ol>
                </div>
              ) : (
                <ol className="list-decimal ml-5 space-y-1">
                  <li>Check that your Supabase project is running</li>
                  <li>Verify your environment variables are set correctly</li>
                  <li>Make sure the database tables have been created properly</li>
                  <li>Check RLS policies if you're using authentication</li>
                </ol>
              )}
            </div>
            <div className="flex gap-4">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={async () => {
                  const success = await checkConnection();
                  if (success) {
                    alert('Database connection verified successfully!');
                    fetchData();
                  }
                }}
              >
                Verify Database Access
              </Button>
              
              {connectionError?.includes('tables do not exist') && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={async () => {
                    setIsLoading(true);
                    const success = await setupDatabase();
                    setIsLoading(false);
                    if (success) {
                      alert('Database tables created successfully!');
                      fetchData();
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Tables...</>
                  ) : (
                    <>Create Database Tables</>
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full flex flex-wrap sm:flex-nowrap gap-2 mb-8 bg-gray-50 p-1 rounded-lg">
                <TabsTrigger 
                  value="level10" 
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeTab === "level10" 
                      ? "bg-white shadow-md text-blue-600 border-b-2 border-blue-600 transform scale-[1.02]" 
                      : "text-gray-600 hover:bg-blue-100 bg-blue-50"
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium">Level 10 Meeting</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="vto" 
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeTab === "vto" 
                      ? "bg-white shadow-md text-green-600 border-b-2 border-green-600 transform scale-[1.02]" 
                      : "text-gray-600 hover:bg-green-100 bg-green-50"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Vision Traction</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="presentations" 
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeTab === "presentations" 
                      ? "bg-white shadow-md text-purple-600 border-b-2 border-purple-600 transform scale-[1.02]" 
                      : "text-gray-600 hover:bg-purple-100 bg-purple-50"
                  }`}
                >
                  <Presentation className="w-5 h-5" />
                  <span className="font-medium">Presentations</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="memberships" 
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeTab === "memberships" 
                      ? "bg-white shadow-md text-orange-600 border-b-2 border-orange-600 transform scale-[1.02]" 
                      : "text-gray-600 hover:bg-orange-100 bg-orange-50"
                  }`}
                >
                  <Users2 className="w-5 h-5" />
                  <span className="font-medium">Memberships</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="targetList" 
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeTab === "targetList" 
                      ? "bg-white shadow-md text-red-600 border-b-2 border-red-600 transform scale-[1.02]" 
                      : "text-gray-600 hover:bg-red-100 bg-red-50"
                  }`}
                >
                  <Target className="w-5 h-5" />
                  <span className="font-medium">Target List</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Content */}
              {isLoading ? (
                <LoadingIndicator message={`Loading ${activeTab} data...`} />
              ) : tabErrors[activeTab] ? (
                <ErrorCard 
                  title={`Error in ${activeTab} tab`} 
                  error={tabErrors[activeTab]} 
                  onRetry={() => fetchData()} 
                />
              ) : (
                <>
                  {/* Level 10 Meeting Tab - UPDATED with Hot Properties and Terminations */}
                  <TabsContent value="level10">
                    <div className="space-y-6">
                      <div className="flex items-center border-b border-blue-100 pb-4 mb-2">
                        <Building2 className="h-7 w-7 text-blue-600 mr-3" />
                        <h2 className="text-xl font-bold text-gray-800">Level 10 Meeting <span className="text-blue-600">Tracker</span></h2>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                      <div className="lg:col-span-2 bg-gradient-to-r from-blue-50 to-white rounded-xl p-6 border border-blue-100 shadow-sm">
                          <div className="flex items-center mb-4">
                            <div className="h-8 w-1 bg-blue-500 rounded-full mr-3"></div>
                            <h3 className="text-sm font-medium text-gray-700">Meeting Week</h3>
                          </div>
                          <p className="font-medium text-blue-800">{selectedWeek ? weekOptions.find((opt: WeekOption) => opt.value === selectedWeek)?.label : 'Current Week'}</p>
                        </div>
                        
                        <div className="lg:col-span-5 bg-gradient-to-r from-indigo-50 to-white rounded-xl p-6 border border-indigo-100 shadow-sm">
  <FormField
    label="Attendees"
    name="attendees"
    value={formData.attendees}
    onChange={handleInputChange}
    placeholder="Enter attendees"
    icon={<Users className="h-5 w-5 text-indigo-500" />}
  />
</div>
                        
<div className="lg:col-span-3 bg-gradient-to-r from-sky-50 to-white rounded-xl p-6 border border-sky-100 shadow-sm">
  <FormField
    label="Safety Message"
    name="safetyMessage"
    value={formData.safetyMessage}
    onChange={handleInputChange}
    placeholder="Enter safety message of the week"
    icon={<ShieldAlert className="h-5 w-5 text-sky-500" />}
  />
</div>
                      </div>

                      <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-xl p-6 border border-blue-100 shadow-sm">
  <div className="mb-4 flex items-center">
    <img 
      src="/icons/agave.png" 
      alt="Agave Icon" 
      className="h-5 w-8 mr-2" 
    />
    <h3 className="text-lg font-medium text-blue-600">EnCore Values/Sales Story or Something you Learned</h3>
  </div>
  <FormField
    label=""
    name="encoreValues"
    value={formData.encoreValues}
    onChange={handleInputChange}
    placeholder="Share success story or learning experience"
    isTextArea
  />
</div>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div className="space-y-6 flex flex-col">
    <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-shadow flex-grow">
      <div className="mb-4 flex items-center">
        <Handshake className="h-5 w-5 text-green-600 mr-2" />
        <h3 className="text-lg font-medium text-green-700">What We're Closing <span className="text-sm font-normal text-gray-500">(10 minutes)</span></h3>
      </div>
      
      {/* Monthly Revenue Goals with Edit Capability */}
      <div className="bg-white p-3 rounded-lg border border-green-100 mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-medium text-gray-600">Monthly Revenue Goals</div>
          <div className="text-sm font-medium text-gray-600">
            {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        
        {/* Las Vegas Region */}
        <div className="p-2 border-b border-gray-100">
  <div className="flex items-center mb-2">
    <img src="/icons/lv.png" alt="Las Vegas" className="h-5 w-5 mr-2" />
    <span className="font-medium text-yellow-800">Las Vegas</span>
    
    {/* Add Detail button */}
    <button
      onClick={() => handleShowDetails('Las Vegas')}
      className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
    >
      Detail
    </button>
    
    {/* Calculate percentage */}
    <span className="ml-auto text-xs text-gray-500">
      {Math.min(100, Math.round((parseFloat(formData.lvMonthlyRevenueActual || '0') / 
        (parseFloat(formData.lvMonthlyRevenueGoal || '1') || 1)) * 100))}% of goal
    </span>
  </div>
          
          {/* Progress bar */}
          <div className="flex items-center">
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div 
                className={`${parseFloat(formData.lvMonthlyRevenueActual || '0') >= parseFloat(formData.lvMonthlyRevenueGoal || '0') 
                  ? 'bg-green-600' : 'bg-yellow-500'} h-2.5 rounded-full`}
                style={{ 
                  width: `${Math.min(100, Math.round((parseFloat(formData.lvMonthlyRevenueActual || '0') / 
                    (parseFloat(formData.lvMonthlyRevenueGoal || '1') || 1)) * 100))}%` 
                }} 
              ></div>
            </div>
          </div>
          
          {/* Editable values */}
          <div className="mt-2 flex justify-between text-sm">
            <div>
              <span className="mr-1 text-gray-500">$</span>
              <input
                type="text"
                className="w-24 font-bold text-yellow-700 border-b border-dashed border-gray-300 focus:outline-none focus:border-yellow-500 bg-transparent"
                value={formatNumberWithCommas(formData.lvMonthlyRevenueActual)}
                onFocus={(e) => {
                  // Show raw value (without commas) when focused
                  e.target.value = formData.lvMonthlyRevenueActual;
                }}
                onBlur={(e) => {
                  // Format with commas when focus is lost
                  e.target.value = formatNumberWithCommas(formData.lvMonthlyRevenueActual);
                }}
                onChange={(e) => {
                  // Only allow numbers and decimals
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  setFormData(prev => ({...prev, lvMonthlyRevenueActual: value}));
                  setIsFormModified(true);
                }}
              />
              <span className="ml-1 text-gray-500">Actual</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500">Goal: $</span>
              <input
                type="text"
                className="w-24 font-bold text-gray-700 border-b border-dashed border-gray-300 focus:outline-none focus:border-yellow-500 bg-transparent"
                value={formatNumberWithCommas(formData.lvMonthlyRevenueGoal)}
                onFocus={(e) => {
                  e.target.value = formData.lvMonthlyRevenueGoal;
                }}
                onBlur={(e) => {
                  e.target.value = formatNumberWithCommas(formData.lvMonthlyRevenueGoal);
                }}
                onChange={(e) => {
                  // Only allow numbers and decimals
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  setFormData(prev => ({...prev, lvMonthlyRevenueGoal: value}));
                  setIsFormModified(true);
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Phoenix Region */}
        <div className="p-2 pt-3">
  <div className="flex items-center mb-2">
    <img src="/icons/az.png" alt="Phoenix" className="h-5 w-5 mr-2" />
    <span className="font-medium text-orange-800">Phoenix</span>
    
    {/* Add Detail button */}
    <button
      onClick={() => handleShowDetails('Phoenix')}
      className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
    >
      Detail
    </button>
    
    {/* Calculate percentage */}
    <span className="ml-auto text-xs text-gray-500">
      {Math.min(100, Math.round((parseFloat(formData.phxMonthlyRevenueActual || '0') / 
        (parseFloat(formData.phxMonthlyRevenueGoal || '1') || 1)) * 100))}% of goal
    </span>
  </div>
          
          {/* Progress bar */}
          <div className="flex items-center">
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div 
                className={`${parseFloat(formData.phxMonthlyRevenueActual || '0') >= parseFloat(formData.phxMonthlyRevenueGoal || '0') 
                  ? 'bg-green-600' : 'bg-orange-500'} h-2.5 rounded-full`}
                style={{ 
                  width: `${Math.min(100, Math.round((parseFloat(formData.phxMonthlyRevenueActual || '0') / 
                    (parseFloat(formData.phxMonthlyRevenueGoal || '1') || 1)) * 100))}%` 
                }} 
              ></div>
            </div>
          </div>
          
          {/* Editable values */}
          <div className="mt-2 flex justify-between text-sm">
            <div>
              <span className="mr-1 text-gray-500">$</span>
              <input
                type="text"
                className="w-24 font-bold text-orange-700 border-b border-dashed border-gray-300 focus:outline-none focus:border-orange-500 bg-transparent"
                value={formatNumberWithCommas(formData.phxMonthlyRevenueActual)}
                onFocus={(e) => {
                  e.target.value = formData.phxMonthlyRevenueActual;
                }}
                onBlur={(e) => {
                  e.target.value = formatNumberWithCommas(formData.phxMonthlyRevenueActual);
                }}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  setFormData(prev => ({...prev, phxMonthlyRevenueActual: value}));
                  setIsFormModified(true);
                }}
              />
              <span className="ml-1 text-gray-500">Actual</span>
            </div>
            
            <div className="text-right">
              <span className="text-gray-500">Goal: $</span>
              <input
                type="text"
                className="w-24 font-bold text-gray-700 border-b border-dashed border-gray-300 focus:outline-none focus:border-orange-500 bg-transparent"
                value={formatNumberWithCommas(formData.phxMonthlyRevenueGoal)}
                onFocus={(e) => {
                  e.target.value = formData.phxMonthlyRevenueGoal;
                }}
                onBlur={(e) => {
                  e.target.value = formatNumberWithCommas(formData.phxMonthlyRevenueGoal);
                }}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  setFormData(prev => ({...prev, phxMonthlyRevenueGoal: value}));
                  setIsFormModified(true);
                }}
              />
            </div>
          </div>
        </div>
      </div>
      
      <FormField
        label=""
        name="closingDeals"
        value={formData.closingDeals}
        onChange={handleInputChange}
        placeholder="Update on deals close to signing"
        isTextArea
      />
    </div>

    <div className="bg-gradient-to-br from-yellow-50 to-white rounded-xl p-6 border border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 flex items-center">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
        <h3 className="text-lg font-medium text-yellow-700">Hot Properties</h3>
      </div>
      <FormField
        label=""
        name="hotProperties"
        value={formData.hotProperties || ''}
        onChange={handleInputChange}
        placeholder="Properties with high potential or activity"
        isTextArea
      />
    </div>
  </div>
  
  <div className="space-y-6 flex flex-col">
  <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-200 shadow-sm hover:shadow-md transition-shadow flex-grow flex flex-col">
    <div className="mb-4 flex items-center">
      <FileText className="h-5 w-5 text-blue-600 mr-2" />
      <h3 className="text-lg font-medium text-blue-700">What We're Bidding <span className="text-sm font-normal text-gray-500">(20 minutes)</span></h3>
    </div>
    <textarea
      name="biddingDeals"
      value={formData.biddingDeals}
      onChange={handleInputChange}
      placeholder="Current bid status and updates"
      className="flex-grow w-full bg-white border border-gray-200 rounded-lg p-3 transition-colors duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 min-h-[120px]"
    />
  </div>
                          
    <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-6 border border-red-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 flex items-center">
        <FileX className="h-5 w-5 text-red-600 mr-2" />
        <h3 className="text-lg font-medium text-red-700">Terminations/Ownership Changes</h3>
      </div>
      <FormField
        label=""
        name="terminationChanges"
        value={formData.terminationChanges || ''}
        onChange={handleInputChange}
        placeholder="Account terminations or ownership changes to monitor"
        isTextArea
      />
    </div>
  </div>
</div>

{/* Add the CalendarEventsView component here */}
<div className="mt-8 w-full p-6 border border-blue-200 rounded-xl bg-blue-50">
  <CalendarEventsView 
    associationUpdate={formData.associationUpdate}
    associationEvents={formData.associationEvents}
    onUpdateChange={(text) => {
      setFormData(prev => ({...prev, associationUpdate: text}));
      setIsFormModified(true);
    }}
    onEventsChange={(events) => {
      setFormData(prev => ({...prev, associationEvents: events}));
      setIsFormModified(true);
    }}
  />
</div>
                        
                      
                    </div>
                  </TabsContent>

                  {/* Vision Traction Organizer Tab - IMPROVED UI FOR YEARLY GOALS */}
                  <TabsContent value="vto" className="space-y-6">
                    {/* Yearly Goals Section with Regional Metrics - IMPROVED UI */}
                    <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                      <div className="flex justify-between items-center mb-4">
                        <SectionHeader title={`${new Date().getFullYear()} Yearly Goals by Region`} />
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                          onClick={(e) => handleMetricsUpdate(e)}
                        >
                          Update All Metrics
                        </Button>
                      </div>

                      {/* Las Vegas Region - Updated with white boxes and wider input fields */}
                      <div className="mb-8">
  <div className="flex items-center mb-4">
    <img src="/icons/lv.png" alt="Las Vegas" className="h-6 w-6 mr-2" />
    <h3 className="text-lg font-semibold text-yellow-800">Las Vegas</h3>
    <Button 
      variant="ghost" 
      size="sm"
      className="ml-auto border-yellow-300 text-yellow-600 hover:bg-yellow-50"
      onClick={(e) => handleMetricsUpdate(e, 'Las Vegas')}
    >
      Update Las Vegas Metrics
    </Button>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-50 p-4 rounded-xl border border-black">
                          <div className="bg-white p-6 rounded-xl border border-gray-400 transition-all duration-200 hover:shadow-md">
                            <div className="text-sm text-gray-600 mb-2">Revenue</div>
                            <div className="flex justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-500">TARGET</div>
                                <div className="text-3xl font-bold text-green-800">${yearlyGoals['Las Vegas'].revenueTarget}M</div>
                                <div className="text-sm text-gray-600 mt-1">{yearlyGoals['Las Vegas'].revenueDescription}</div>
                              </div>
                              <div className="border-l border-gray-200 pl-4">
                                <div className="text-sm font-medium text-gray-500">CURRENT</div>
                                <input 
                                  type="text"
                                  className={`text-3xl font-bold ${parseFloat(yearlyGoals['Las Vegas'].currentRevenue) / parseFloat(yearlyGoals['Las Vegas'].revenueTarget) >= 1 ? 'text-green-600' : 'text-red-600'} bg-transparent border-b border-dashed border-gray-300 w-36 focus:outline-none focus:border-yellow-500`}
                                  value={`$${yearlyGoals['Las Vegas'].currentRevenue}M`}
                                  onChange={(e) => handleCurrentRevenueChange(e, 'Las Vegas')}
                                  aria-label="Current Revenue"
                                />
                                <div className="text-sm text-gray-600 mt-1">
                                  <span className={`font-medium ${parseFloat(yearlyGoals['Las Vegas'].currentRevenue) / parseFloat(yearlyGoals['Las Vegas'].revenueTarget) >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                                      {((parseFloat(yearlyGoals['Las Vegas'].currentRevenue) / parseFloat(yearlyGoals['Las Vegas'].revenueTarget)) * 100).toFixed(1)}%
                                   </span> of target
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-gray-400 transition-all duration-200 hover:shadow-md">
                            <div className="text-sm text-gray-600 mb-2">Retention</div>
                            <div className="flex justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-500">TARGET</div>
                                <div className="text-3xl font-bold text-green-800">{yearlyGoals['Las Vegas'].retentionGoal}%</div>
                                <div className="text-sm text-gray-600 mt-1">{yearlyGoals['Las Vegas'].retentionDescription}</div>
                              </div>
                              <div className="border-l border-gray-200 pl-4">
                                <div className="text-sm font-medium text-gray-500">CURRENT</div>
                                <input 
                                  type="text"
                                  className={`text-3xl font-bold ${parseFloat(yearlyGoals['Las Vegas'].currentRetention) / parseFloat(yearlyGoals['Las Vegas'].retentionGoal) >= 1 ? 'text-green-600' : 'text-red-600'} bg-transparent border-b border-dashed border-gray-300 w-24 focus:outline-none focus:border-yellow-500`}
                                  value={`${yearlyGoals['Las Vegas'].currentRetention}%`}
                                  onChange={(e) => handleCurrentRetentionChange(e, 'Las Vegas')}
                                  aria-label="Current Retention"
                                />
                                <div className="text-sm text-gray-600 mt-1">
                                  <span className={`font-medium ${parseFloat(yearlyGoals['Las Vegas'].currentRetention) / parseFloat(yearlyGoals['Las Vegas'].retentionGoal) >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                                      {((parseFloat(yearlyGoals['Las Vegas'].currentRetention) / parseFloat(yearlyGoals['Las Vegas'].retentionGoal)) * 100).toFixed(1)}%
                                   </span> of target
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Phoenix Region - Updated with white boxes and wider input fields */}
                      <div>
                      <div className="flex items-center mb-4">
    <img src="/icons/az.png" alt="Phoenix" className="h-6 w-6 mr-2" />
    <h3 className="text-lg font-semibold text-orange-800">Phoenix</h3>
    <Button 
      variant="ghost" 
      size="sm"
      className="ml-auto border-orange-300 text-orange-600 hover:bg-orange-50"
      onClick={(e) => handleMetricsUpdate(e, 'Phoenix')}
    >
      Update Phoenix Metrics
    </Button>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gradient-to-r from-orange-100 via-white-50 to-orange-50 p-4 rounded-xl border border-black">
                          <div className="bg-white p-6 rounded-xl border border-gray-400 transition-all duration-200 hover:shadow-md">
                            <div className="text-sm text-gray-600 mb-2">Revenue</div>
                            <div className="flex justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-500">TARGET</div>
                                <div className="text-3xl font-bold text-green-800">${yearlyGoals['Phoenix'].revenueTarget}M</div>
                                <div className="text-sm text-gray-600 mt-1">{yearlyGoals['Phoenix'].revenueDescription}</div>
                              </div>
                              <div className="border-l border-gray-200 pl-4">
                                <div className="text-sm font-medium text-gray-500">CURRENT</div>
                                <input 
                                  type="text"
                                  className={`text-3xl font-bold ${parseFloat(yearlyGoals['Phoenix'].currentRevenue) / parseFloat(yearlyGoals['Phoenix'].revenueTarget) >= 1 ? 'text-green-600' : 'text-red-600'} bg-transparent border-b border-dashed border-gray-300 w-36 focus:outline-none focus:border-orange-500`}
                                  value={`$${yearlyGoals['Phoenix'].currentRevenue}M`}
                                  onChange={(e) => handleCurrentRevenueChange(e, 'Phoenix')}
                                  aria-label="Current Revenue"
                                />
                                <div className="text-sm text-gray-600 mt-1">
                                  <span className={`font-medium ${parseFloat(yearlyGoals['Phoenix'].currentRevenue) / parseFloat(yearlyGoals['Phoenix'].revenueTarget) >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                                      {((parseFloat(yearlyGoals['Phoenix'].currentRevenue) / parseFloat(yearlyGoals['Phoenix'].revenueTarget)) * 100).toFixed(1)}%
                                   </span> of target
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-gray-400 transition-all duration-200 hover:shadow-md">
                            <div className="text-sm text-gray-600 mb-2">Retention</div>
                            <div className="flex justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-500">TARGET</div>
                                <div className="text-3xl font-bold text-green-800">90%</div> {/* Updated to 90% as requested */}
                                <div className="text-sm text-gray-600 mt-1">{yearlyGoals['Phoenix'].retentionDescription}</div>
                              </div>
                              <div className="border-l border-gray-200 pl-4">
                                <div className="text-sm font-medium text-gray-500">CURRENT</div>
                                <input 
                                  type="text"
                                  className={`text-3xl font-bold ${parseFloat(yearlyGoals['Phoenix'].currentRetention) >= 90 ? 'text-green-600' : 'text-red-600'} bg-transparent border-b border-dashed border-gray-300 w-24 focus:outline-none focus:border-orange-500`}
                                  value={`${yearlyGoals['Phoenix'].currentRetention}%`}
                                  onChange={(e) => handleCurrentRetentionChange(e, 'Phoenix')}
                                  aria-label="Current Retention"
                                />
                                <div className="text-sm text-gray-600 mt-1">
                                  <span className={`font-medium ${parseFloat(yearlyGoals['Phoenix'].currentRetention) >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                                      {((parseFloat(yearlyGoals['Phoenix'].currentRetention) / 90) * 100).toFixed(1)}%
                                   </span> of target
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Issues List */}
                    <div className="bg-white p-6 rounded-xl border border-gray-300 shadow-sm">
  <div className="flex items-center mb-4">
    <ClipboardList className="h-5 w-5 text-gray-600 mr-2" />
    <h3 className="text-lg font-semibold text-gray-800">Issues List</h3>
  </div>
  <div className="h-1 w-20 bg-blue-600 mt-2 rounded-full"></div>
  <div className="space-y-4">
                        {issuesList.map((issue: Issue, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg transition-all duration-200 hover:bg-gray-100">
                            <input 
                              type="checkbox" 
                              checked={issue.isCompleted}
                              onChange={() => {
                                const newList = [...issuesList];
                                newList[index].isCompleted = !issue.isCompleted;
                                setIssuesList(newList);
                              }}
                              className="w-5 h-5 rounded border-gray-300" 
                            />
                            <input
                              type="text"
                              className={`flex-1 bg-transparent border-0 focus:ring-0 ${issue.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}
                              defaultValue={issue.issueText}
                              onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                const newList = [...issuesList];
                                newList[index].issueText = e.target.value;
                                setIssuesList(newList);
                              }}
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className="w-24 text-sm text-gray-500 bg-transparent border-0 focus:ring-0 text-right"
                                defaultValue={issue.assignedTo}
                                placeholder="Assign to"
                                onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                  const newList = [...issuesList];
                                  newList[index].assignedTo = e.target.value;
                                  setIssuesList(newList);
                                }}
                              />
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-1 h-auto text-gray-400 hover:text-red-600"
                                onClick={() => {
                                  setIssuesList(issuesList.filter((_, i: number) => i !== index));
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button 
                          className="w-full mt-4 border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600"
                          onClick={() => {
                            setIssuesList([
                              ...issuesList,
                              { id: null, issueText: "New issue", isCompleted: false, assignedTo: "", dueDate: new Date() }
                            ]);
                          }}
                        >
                          + Add New Issue
                        </Button>
                      </div>
                    </div>
                    
                    {/* Quarterly Rocks Section */}
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
  <div className="flex items-center mb-4">
    <Mountain className="h-5 w-5 text-blue-600 mr-2" />
    <h3 className="text-lg font-semibold text-gray-800">Quarterly Rocks</h3>
  </div>
  <div className="h-1 w-20 bg-blue-600 mt-2 rounded-full"></div>
  <div className="space-y-6">
                        {/* CRE Groups & Committees */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                            <input
                              type="text"
                              className="text-lg font-semibold text-gray-800 bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-blue-500 focus:ring-0 pb-1"
                              defaultValue={quarterlyRocks.creGroups.title}
                              onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                setQuarterlyRocks({
                                  ...quarterlyRocks,
                                  creGroups: {
                                    ...quarterlyRocks.creGroups,
                                    title: e.target.value
                                  }
                                });
                              }}
                            />
                            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mt-2 sm:mt-0 flex items-center">
                              <span className="mr-2">Assigned:</span>
                              <input
                                type="text"
                                className="w-28 bg-transparent border-0 focus:ring-0 text-blue-800 font-medium"
                                defaultValue={quarterlyRocks.creGroups.assignedTo}
                                onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                  setQuarterlyRocks({
                                    ...quarterlyRocks,
                                    creGroups: {
                                      ...quarterlyRocks.creGroups,
                                      assignedTo: e.target.value
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>
                              <label className="text-sm font-medium">Current Groups</label>
                              <textarea 
                                className="mt-2 w-full rounded-xl border border-gray-200 p-3 min-h-24"
                                placeholder="List current CRE group memberships"
                                value={quarterlyRocks.creGroups.currentGroups}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                  setQuarterlyRocks({
                                    ...quarterlyRocks,
                                    creGroups: {
                                      ...quarterlyRocks.creGroups,
                                      currentGroups: e.target.value
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Action Items</label>
                              <textarea 
                                className="mt-2 w-full rounded-xl border border-gray-200 p-3 min-h-24"
                                placeholder="List pending actions and next steps"
                                value={quarterlyRocks.creGroups.actionItems}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                  setQuarterlyRocks({
                                    ...quarterlyRocks,
                                    creGroups: {
                                      ...quarterlyRocks.creGroups,
                                      actionItems: e.target.value
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Production Rates */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                            <input
                              type="text"
                              className="text-lg font-semibold text-gray-800 bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-blue-500 focus:ring-0 pb-1"
                              defaultValue={quarterlyRocks.productionRates.title}
                              onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                setQuarterlyRocks({
                                  ...quarterlyRocks,
                                  productionRates: {
                                    ...quarterlyRocks.productionRates,
                                    title: e.target.value
                                  }
                                });
                              }}
                            />
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mt-2 sm:mt-0 flex items-center">
                              <span className="mr-2">Assigned:</span>
                              <input
                                type="text"
                                className="w-28 bg-transparent border-0 focus:ring-0 text-green-800 font-medium"
                                defaultValue={quarterlyRocks.productionRates.assignedTo}
                                onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                  setQuarterlyRocks({
                                    ...quarterlyRocks,
                                    productionRates: {
                                      ...quarterlyRocks.productionRates,
                                      assignedTo: e.target.value
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>
                              <label className="text-sm font-medium">Current Status</label>
                              <input 
                                type="text"
                                className="mt-2 w-full rounded-xl border border-gray-200 p-3"
                                placeholder="Current implementation status"
                                value={quarterlyRocks.productionRates.currentStatus}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  setQuarterlyRocks({
                                    ...quarterlyRocks,
                                    productionRates: {
                                      ...quarterlyRocks.productionRates,
                                      currentStatus: e.target.value
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Updates & Notes</label>
                              <textarea 
                                className="mt-2 w-full rounded-xl border border-gray-200 p-3 min-h-24"
                                placeholder="Recent updates and progress notes"
                                value={quarterlyRocks.productionRates.updatesNotes}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                  setQuarterlyRocks({
                                    ...quarterlyRocks,
                                    productionRates: {
                                      ...quarterlyRocks.productionRates,
                                      updatesNotes: e.target.value
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Q3-4 Events */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                            <input
                              type="text"
                              className="text-lg font-semibold text-gray-800 bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-blue-500 focus:ring-0 pb-1"
                              defaultValue={quarterlyRocks.events.title}
                              onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                setQuarterlyRocks({
                                  ...quarterlyRocks,
                                  events: {
                                    ...quarterlyRocks.events,
                                    title: e.target.value
                                  }
                                });
                              }}
                            />
                            <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium mt-2 sm:mt-0 flex items-center">
                              <span className="mr-2">Assigned:</span>
                              <input
                                type="text"
                                className="w-28 bg-transparent border-0 focus:ring-0 text-orange-800 font-medium"
                                defaultValue={quarterlyRocks.events.assignedTo}
                                onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                  setQuarterlyRocks({
                                    ...quarterlyRocks,
                                    events: {
                                      ...quarterlyRocks.events,
                                      assignedTo: e.target.value
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>
                              <label className="flex items-center text-sm font-medium">
                                <span className="h-3 w-3 rounded-full bg-green-400 mr-2"></span>
                                Putting World Event
                              </label>
                              <textarea 
                                className="mt-2 w-full rounded-xl border border-gray-200 p-3 min-h-32"
                                placeholder="Event details"
                                value={quarterlyRocks.events.puttingWorldEvent}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                  setQuarterlyRocks({
                                    ...quarterlyRocks,
                                    events: {
                                      ...quarterlyRocks.events,
                                      puttingWorldEvent: e.target.value
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <label className="flex items-center text-sm font-medium">
                                <span className="h-3 w-3 rounded-full bg-orange-400 mr-2"></span>
                                LV Charcuterie Event
                              </label>
                              <textarea 
                                className="mt-2 w-full rounded-xl border border-gray-200 p-3 min-h-32"
                                placeholder="Event details"
                                value={quarterlyRocks.events.lvCharcuterieEvent}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                  setQuarterlyRocks({
                                    ...quarterlyRocks,
                                    events: {
                                      ...quarterlyRocks.events,
                                      lvCharcuterieEvent: e.target.value
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Presentations Tab */}
<TabsContent value="presentations">
  <div className="space-y-6">
    {/* Guidelines Section */}
    <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
      <div className="flex items-center mb-4">
        <ClipboardCheck className="h-5 w-5 text-purple-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">Notes/Always bring to a meeting:</h3>
      </div>
      <div className="h-1 w-20 bg-purple-600 mt-2 rounded-full"></div>
      <ul className="space-y-3 text-purple-900">
        {meetingGuidelines.map((guideline: Guideline, index: number) => (
          <li key={index} className="flex items-start p-3 bg-white rounded-lg border border-purple-100">
            <span className="mr-3 text-purple-500">•</span>
            {guideline.guidelineText}
          </li>
        ))}
      </ul>
    </div>

                      {/* Objection Handling Table */}
<div className="rounded-xl border border-gray-300 overflow-hidden">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b bg-white">
    <div className="flex items-center">
      <ShieldQuestion className="h-5 w-5 text-purple-600 mr-2" />
      <h3 className="text-lg font-bold text-gray-800">Objection Handling</h3>
    </div>
    <Button 
      className="bg-purple-600 hover:bg-purple-700 text-white mt-3 sm:mt-0"
      onClick={() => {
        const newObjection = {
          id: `temp-${Date.now()}`,
          objection: "New objection",
          rebuttal: "How to handle it",
          thingsToSay: "Recommended phrases",
          thingsNotToSay: "Phrases to avoid",
          isEditing: true
        };
        setObjectionHandling([...objectionHandling, newObjection]);
        // Set the new objection as being edited
        handleObjectionSave(newObjection, true);
      }}
    >
      + Add New Entry
    </Button>
  </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-purple-50">
                                <th className="p-4 text-left font-medium text-gray-600">Common Objections</th>
                                <th className="p-4 text-left font-medium text-gray-600">Rebuttal</th>
                                <th className="p-4 text-left font-medium text-gray-600">Things to Say</th>
                                <th className="p-4 text-left font-medium text-gray-600">Things Not to Say</th>
                                <th className="p-4 text-left font-medium text-gray-600">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {objectionHandling.map((objection: Objection, index: number) => (
                                <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                                  <td className="p-4">
                                    {objection.isEditing ? (
                                      <Input
                                        className="border border-purple-200 p-2 w-full"
                                        value={objection.objection}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleObjectionChange(index, 'objection', e.target.value)}
                                      />
                                    ) : (
                                      objection.objection
                                    )}
                                  </td>
                                  <td className="p-4">
                                    {objection.isEditing ? (
                                      <textarea
                                        className="border border-purple-200 p-2 w-full min-h-24"
                                        value={objection.rebuttal}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleObjectionChange(index, 'rebuttal', e.target.value)}
                                      />
                                    ) : (
                                      objection.rebuttal
                                    )}
                                  </td>
                                  <td className="p-4">
                                    {objection.isEditing ? (
                                      <textarea
                                        className="border border-purple-200 p-2 w-full min-h-24"
                                        value={objection.thingsToSay}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleObjectionChange(index, 'thingsToSay', e.target.value)}
                                        placeholder="Enter items, one per line"
                                      />
                                    ) : (
                                      <ul className="list-disc pl-4 text-sm space-y-1">
                                        {objection.thingsToSay.split("\n").map((item: string, i: number) => (
                                          <li key={i}>{item}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </td>
                                  <td className="p-4 text-red-600">
                                    {objection.isEditing ? (
                                      <textarea
                                        className="border border-purple-200 p-2 w-full min-h-24 text-gray-700"
                                        value={objection.thingsNotToSay}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleObjectionChange(index, 'thingsNotToSay', e.target.value)}
                                        placeholder="Enter items, one per line"
                                      />
                                    ) : (
                                      <ul className="list-disc pl-4 text-sm space-y-1">
                                        {objection.thingsNotToSay.split("\n").map((item: string, i: number) => (
                                          <li key={i}>{item}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <div className="flex flex-col gap-2">
                                      {objection.isEditing ? (
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="border-green-500 text-green-600"
                                          onClick={() => handleObjectionSave(objection)}
                                        >
                                          Save
                                        </Button>
                                      ) : (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleObjectionEdit(index)}
                                        >
                                          Edit
                                        </Button>
                                      )}
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-red-600 hover:text-red-800"
                                        onClick={() => handleObjectionDelete(index)}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Quick Tips Section */}
                      <div className="p-6 border rounded-xl bg-purple-50">
                        <h3 className="text-sm font-medium mb-4">Quick Tips</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {quickTips.map((tip: QuickTip, index: number) => (
                            <div key={index} className="bg-white p-4 rounded-xl border border-purple-100 transition-all duration-200 hover:shadow-md">
                              <div className="text-sm text-gray-600">{tip.category}</div>
                              <div className="text-sm mt-2">{tip.tipText}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* Memberships Tab Content */}
<TabsContent value="memberships">
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <UsersRound className="h-5 w-5 text-orange-600 mr-2" />
        <h2 className="text-xl font-bold">Association Memberships</h2>
      </div>
      <Button 
        className="bg-orange-600 hover:bg-orange-700 text-white"
        onClick={() => {
          const newMembership = {
            id: `temp-${Date.now()}`,
            salesRep: "New Rep",
            groups: "",
            committees: "",
            meetingSchedule: "",
            meetingsAttended: 0,
            totalMeetings: 0,
            isEditing: true
          };
          setMemberships([...memberships, newMembership]);
          handleMembershipSave(newMembership, true);
        }}
      >
        + Add Membership
      </Button>
    </div>

                      {/* Memberships Table */}
                      <div className="rounded-xl border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-orange-50">
                              <th className="p-3 text-left font-medium">Sales Rep</th>
                              <th className="p-3 text-left font-medium">Group(s)</th>
                              <th className="p-3 text-left font-medium">Committees</th>
                              <th className="p-3 text-left font-medium">Committee Meets When?</th>
                              <th className="p-3 text-left font-medium">Monthly Meetings Attended</th>
                              <th className="p-3 text-left font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberships.map((membership: Membership, index: number) => (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="p-3">
                                  {membership.isEditing ? (
                                    <Input
                                      className="border border-orange-200 p-2 w-full"
                                      value={membership.salesRep}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMembershipChange(index, 'salesRep', e.target.value)}
                                    />
                                  ) : (
                                    membership.salesRep
                                  )}
                                </td>
                                <td className="p-3">
                                  {membership.isEditing ? (
                                    <Input
                                      className="border border-orange-200 p-2 w-full"
                                      value={membership.groups}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMembershipChange(index, 'groups', e.target.value)}
                                      placeholder="BOMA, NAIOP, etc."
                                    />
                                  ) : (
                                    membership.groups
                                  )}
                                </td>
                                <td className="p-3">
                                  {membership.isEditing ? (
                                    <Input
                                      className="border border-orange-200 p-2 w-full"
                                      value={membership.committees}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMembershipChange(index, 'committees', e.target.value)}
                                      placeholder="Committee names"
                                    />
                                  ) : (
                                    membership.committees
                                  )}
                                </td>
                                <td className="p-3">
                                  {membership.isEditing ? (
                                    <Input
                                      className="border border-orange-200 p-2 w-full"
                                      value={membership.meetingSchedule}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMembershipChange(index, 'meetingSchedule', e.target.value)}
                                      placeholder="e.g., 2nd Tuesday"
                                    />
                                  ) : (
                                    membership.meetingSchedule
                                  )}
                                </td>
                                <td className="p-3">
                                  {membership.isEditing ? (
                                    <div className="flex items-center space-x-2">
                                      <Input
                                        type="number"
                                        className="border border-orange-200 p-2 w-14 text-center"
                                        value={membership.meetingsAttended}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMembershipChange(index, 'meetingsAttended', parseInt(e.target.value) || 0)}
                                        min="0"
                                      />
                                      <span>/</span>
                                      <Input
                                        type="number"
                                        className="border border-orange-200 p-2 w-14 text-center"
                                        value={membership.totalMeetings}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMembershipChange(index, 'totalMeetings', parseInt(e.target.value) || 0)}
                                        min="0"
                                      />
                                    </div>
                                  ) : (
                                    <span className={`px-2 py-1 rounded-full text-sm ${
                                      membership.meetingsAttended === membership.totalMeetings
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}>
                                      {membership.meetingsAttended}/{membership.totalMeetings}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-col gap-2">
                                    {membership.isEditing ? (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="border-green-500 text-green-600"
                                        onClick={() => handleMembershipSave(membership)}
                                      >
                                        Save
                                      </Button>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleMembershipEdit(index)}
                                      >
                                        Edit
                                      </Button>
                                    )}
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-red-600 hover:text-red-800"
                                      onClick={() => handleMembershipDelete(index)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Quick Stats */}
                      <div className="p-6 border rounded-xl bg-orange-50">
                        <h3 className="text-sm font-medium mb-4">Quick Stats</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded-xl border border-orange-100 transition-all duration-200 hover:shadow-md">
                            <div className="text-sm text-gray-600">Total Active Members</div>
                            <div className="text-2xl font-bold">{memberships.length}</div>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-orange-100 transition-all duration-200 hover:shadow-md">
                            <div className="text-sm text-gray-600">Total Groups</div>
                            <div className="text-2xl font-bold">
                              {new Set(memberships.flatMap((m: Membership) => m.groups.split(',').map((g: string) => g.trim()))).size}
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-orange-100 transition-all duration-200 hover:shadow-md">
                            <div className="text-sm text-gray-600">Meeting Attendance</div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold">
                                {Math.round(
                                  (memberships.reduce((sum: number, m: Membership) => sum + m.meetingsAttended, 0) / 
                                   memberships.reduce((sum: number, m: Membership) => sum + m.totalMeetings, 1)) * 100
                                )}
                              </span>
                              <span className="text-gray-600">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* Target List Tab Content - UPDATED to be more table-like and removed Projected Value */}
                  <TabsContent value="targetList">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Target Companies - Commercial Landscape Prospects</h2>
                        <Button 
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => {
                            const newTarget: Target = {
                              id: Date.now().toString(),
                              company: "New Company",
                              contact_name: "New Contact",
                              contact_title: "Position",
                              contact_email: "",
                              properties: "Properties we currently maintain",
                              sales_rep: "",
                              sales_rep_name: "",
                              notes: "New prospect notes",
                              created_at: new Date().toISOString(),
                              projected_value: "0" // Still need to keep this field in the data structure
                            };
                            saveTarget((prevTargets: Target[]) => [...prevTargets, newTarget]);
                          }}
                        >
                          + Add Company
                        </Button>
                      </div>
                      
                      
                      {/* Search Controls */}
<div className="mb-4">
  <Input
    className="border border-gray-200"
    placeholder="Search companies or contacts..."
    value={searchQuery}
    onChange={handleTargetSearch}
  />
</div>

                      {/* Main Target List Table */}
                      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                        <table className="w-full bg-white border-collapse">
                          <thead>
                            <tr className="bg-red-50">
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Company</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Contact Name</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Contact Email</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Properties We Maintain</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Notes</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTargets.length > 0 ? (
                              filteredTargets.map((target: Target) => (
                                <tr key={target.id} className="hover:bg-gray-50 border-b border-gray-100">
                                  <td className="px-4 py-3">
                                    <input
                                      className="w-full bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-red-400 focus:ring-0 text-gray-800"
                                      defaultValue={target.company}
                                      placeholder="Company Name"
                                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                        if (e.target.value !== target.company) {
                                          saveTarget((prevTargets: Target[]) => 
                                            prevTargets.map((t: Target) => 
                                              t.id === target.id 
                                                ? {...t, company: e.target.value} 
                                                : t
                                            )
                                          );
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      className="w-full bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-red-400 focus:ring-0"
                                      defaultValue={target.contact_name}
                                      placeholder="Contact Name"
                                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                        if (e.target.value !== target.contact_name) {
                                          saveTarget((prevTargets: Target[]) => 
                                            prevTargets.map((t: Target) => 
                                              t.id === target.id 
                                                ? {...t, contact_name: e.target.value} 
                                                : t
                                            )
                                          );
                                        }
                                      }}
                                    />
                                    <div className="text-xs text-gray-500 mt-1">{target.contact_title}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      className="w-full bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-red-400 focus:ring-0"
                                      defaultValue={target.contact_email}
                                      placeholder="Email Address"
                                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                        if (e.target.value !== target.contact_email) {
                                          saveTarget((prevTargets: Target[]) => 
                                            prevTargets.map((t: Target) => 
                                              t.id === target.id 
                                                ? {...t, contact_email: e.target.value} 
                                                : t
                                            )
                                          );
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <textarea
                                      className="w-full bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-red-400 focus:ring-0 resize-none min-h-[60px]"
                                      defaultValue={target.properties}
                                      placeholder="Properties"
                                      onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                                        if (e.target.value !== target.properties) {
                                          saveTarget((prevTargets: Target[]) => 
                                            prevTargets.map((t: Target) => 
                                              t.id === target.id 
                                                ? {...t, properties: e.target.value} 
                                                : t
                                            )
                                          );
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <textarea
                                      className="w-full bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-red-400 focus:ring-0 resize-none min-h-[60px]"
                                      defaultValue={target.notes}
                                      placeholder="Notes"
                                      onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                                        if (e.target.value !== target.notes) {
                                          saveTarget((prevTargets: Target[]) => 
                                            prevTargets.map((t: Target) => 
                                              t.id === target.id 
                                                ? {...t, notes: e.target.value} 
                                                : t
                                            )
                                          );
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col gap-2">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-red-600 hover:text-red-800"
                                        onClick={() => {
                                          saveTarget((prevTargets: Target[]) => 
                                            prevTargets.filter((t: Target) => t.id !== target.id)
                                          );
                                        }}
                                      >
                                        Delete
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-blue-600 hover:text-blue-800"
                                        onClick={() => {
                                          const newContact = {
                                            ...target,
                                            id: Date.now().toString(),
                                            contact_name: "New Contact",
                                            contact_title: "",
                                            contact_email: ""
                                          };
                                          saveTarget((prevTargets: Target[]) => [...prevTargets, newContact]);
                                        }}
                                      >
                                        + Contact
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                  <div className="flex flex-col items-center">
                                    <Target className="h-8 w-8 text-red-400 mb-2" />
                                    <p className="text-lg font-medium">No targets found</p>
                                    <p className="text-sm text-gray-500">
  {searchQuery ? 'Try adjusting your search' : 'Add your first target company to get started'}
</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Stats Summary without Projected Value */}
                      {targets.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                            <div className="text-sm text-gray-600 mb-1">Total Companies</div>
                            <div className="text-2xl font-bold">
                              {new Set(targets.map((t: Target) => t.company)).size}
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                            <div className="text-sm text-gray-600 mb-1">Total Contacts</div>
                            <div className="text-2xl font-bold">{targets.length}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        )}
      </div>
      <RevenueDetailsModal />
    </div>
  );
};

export default BDDashboard;