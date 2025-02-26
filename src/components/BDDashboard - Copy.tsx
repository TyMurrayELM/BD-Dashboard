"use client";

import React, { useState, useEffect, useRef } from 'react';
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
RefreshCw
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns';

// Initialize Supabase client with better validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Enhanced logging for debugging
console.log('Supabase URL defined:', !!supabaseUrl, supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'undefined');
console.log('Supabase Key defined:', !!supabaseKey, supabaseKey ? `${supabaseKey.substring(0, 5)}...${supabaseKey.substring(supabaseKey.length - 5)}` : 'undefined');

// Check for missing config before initializing
if (!supabaseUrl || !supabaseKey) {
console.error('Supabase configuration is incomplete. Please check your environment variables.');
}

// Create client with better error handling
let supabase;
try {
supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { 
    persistSession: true,
    autoRefreshToken: true
  }
});
console.log('Supabase client initialized successfully');
} catch (error) {
console.error('Failed to initialize Supabase client:', error);
}

// Enhanced section header component
const SectionHeader = ({ title }: { title: string }) => (
<div className="mb-6">
  <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
  <div className="h-1 w-20 bg-blue-600 mt-2 rounded-full"></div>
</div>
);



// Enhanced form field component
const FormField = ({ 
label, 
name, 
value, 
onChange, 
placeholder, 
isTextArea = false 
}: { 
label: string;
name: string;
value: string;
onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
placeholder: string;
isTextArea?: boolean;
}) => (
<div className="space-y-2 transition-all duration-200 hover:shadow-sm">
  <label className="block text-sm font-medium text-gray-700">
    {label}
  </label>
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
const ErrorCard = ({ 
title, 
error, 
onRetry 
}: { 
title: string; 
error: any; 
onRetry?: () => void;
}) => (
<div className="bg-white rounded-xl p-4 shadow-md border border-red-200 mb-4">
  <div className="flex items-center text-red-600 mb-3">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <h2 className="text-lg font-semibold">{title}</h2>
  </div>
  <p className="text-sm text-gray-700 mb-3">
    {typeof error === 'string' ? error : (error?.message || 'An unknown error occurred')}
  </p>
  {error?.details && (
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
const LoadingIndicator = ({ message = "Loading..." }: { message?: string }) => (
<div className="flex justify-center items-center py-8">
  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-3" />
  <span className="text-gray-600">{message}</span>
</div>
);

const BDDashboard = () => {
  const [activeTab, setActiveTab] = useState("level10");
  const [visitedTabs, setVisitedTabs] = useState<string[]>(["level10"]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [tabErrors, setTabErrors] = useState<Record<string, any>>({});
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [weekOptions, setWeekOptions] = useState<Array<{value: string, label: string}>>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [cachedFormData, setCachedFormData] = useState<Record<string, any>>({});
  const lastFetchedRef = useRef<Record<string, number>>({});
  const [isFormModified, setIsFormModified] = useState(false);

  const [formData, setFormData] = useState({
    attendees: '',
    safetyMessage: '',
    encoreValues: '',
    closingDeals: '',
    biddingDeals: ''
  });

  const [yearlyGoals, setYearlyGoals] = useState({
    id: null as string | null,
    year: new Date().getFullYear(),
    revenueTarget: '3.25',
    revenueDescription: 'new maintenance',
    retentionGoal: '90',
    retentionDescription: 'customer retention'
  });

  const [issuesList, setIssuesList] = useState<Array<{ id: string | null, issueText: string, isCompleted: boolean, assignedTo?: string, dueDate?: Date | null }>>([
    { id: null, issueText: "Create dream 100 list", isCompleted: false, assignedTo: "Sarah", dueDate: new Date() },
    { id: null, issueText: "Monthly budgets for spend", isCompleted: false, assignedTo: "Mike", dueDate: new Date() },
    { id: null, issueText: "Residential tree pruning fact sheet/social post", isCompleted: false, assignedTo: "Lisa", dueDate: new Date() },
    { id: null, issueText: "Visual aids to show internal communication", isCompleted: false, assignedTo: "John", dueDate: new Date() }
  ]);

  const [quarterlyRocks, setQuarterlyRocks] = useState({
    creGroups: {
      id: null as string | null,
      title: 'CRE Groups & Committees',
      assignedTo: 'Andy & Jade',
      currentGroups: '- BOMA Executive Committee\n- NAIOP Development Committee\n- ULI Advisory Board\n- CCIM Chapter Leadership',
      actionItems: '- Schedule Q2 committee meetings\n- Submit speaker proposal for BOMA\n- Follow up on ULI mentorship program\n- Coordinate NAIOP networking event'
    },
    productionRates: {
      id: null as string | null,
      title: 'Production Rates in Aspire',
      assignedTo: 'Mike',
      currentStatus: 'Implementation Phase - 75% Complete',
      updatesNotes: '- Data migration completed for Q1\n- Team training scheduled for next week\n- New metrics dashboard in testing\n- Revenue forecasting module pending review'
    },
    events: {
      id: null as string | null,
      title: 'Q3-4 Events Planning',
      assignedTo: 'Mike',
      puttingWorldEvent: 'Date: September 15\nLocation: Putting World LV\nExpected Attendance: 75\nBudget Status: Approved\nKey Activities:\n- VIP area reserved\n- Catering quotes received\n- Save-the-dates scheduled for July 1',
      lvCharcuterieEvent: 'Date: November 8\nLocation: LV Charcuterie Downtown\nExpected Attendance: 50\nBudget Status: Pending Approval\nKey Activities:\n- Venue walk-through scheduled\n- Menu selection in progress\n- Sponsorship packages drafted'
    }
  });

  const [meetingGuidelines, setMeetingGuidelines] = useState([
    { id: null as string | null, guidelineText: "Copy of proposal. Know it like the back of your hand. Know the boundaries spot on.", category: "Meeting Preparation", sortOrder: 1 },
    { id: null as string | null, guidelineText: "List of references, notable accounts & companies we work with", category: "Meeting Preparation", sortOrder: 2 },
    { id: null as string | null, guidelineText: "Write down names of people in the meeting, refer to them by name during meeting", category: "Meeting Preparation", sortOrder: 3 }
  ]);

  const [objectionHandling, setObjectionHandling] = useState([
    { id: null as string | null, objection: "Your price is higher than competitors", rebuttal: "We focus on total cost of ownership. Our solutions include comprehensive support and proven reliability that reduces long-term expenses.", thingsToSay: "Let me show you our ROI analysis\nHere's how we've saved others money\nConsider these long-term benefits", thingsNotToSay: "We're expensive because we're the best\nOthers cut corners\nYou get what you pay for" },
    { id: null as string | null, objection: "We're happy with current provider", rebuttal: "That's great to hear. Many of our current clients said the same before discovering how our innovative approaches could further improve their operations.", thingsToSay: "What do you like most about them?\nMay I share what sets us apart?\nCould we be your backup option?", thingsNotToSay: "They're outdated\nYou're missing out\nBut we're better" },
    { id: null as string | null, objection: "Not in this year's budget", rebuttal: "Understanding budget constraints is important. Let's explore how our solution could fit within your current financial framework or plan for next cycle.", thingsToSay: "When does your fiscal year start?\nLet's explore financing options\nWould phased implementation help?", thingsNotToSay: "You can't afford not to\nFind the money somewhere\nIt's not that expensive" }
  ]);

  const [quickTips, setQuickTips] = useState([
    { id: null as string | null, category: "Opening", tipText: "Start with questions about their business challenges" },
    { id: null as string | null, category: "Presentation", tipText: "Focus on their specific needs and ROI" },
    { id: null as string | null, category: "Follow-up", tipText: "Always schedule next steps before leaving" }
  ]);

  const [memberships, setMemberships] = useState([
    { id: null as string | null, salesRep: "Sarah Johnson", groups: "BOMA, NAIOP", committees: "Education Committee, Events Committee", meetingSchedule: "2nd Tuesday, 4th Thursday", meetingsAttended: 3, totalMeetings: 3 },
    { id: null as string | null, salesRep: "Mike Chen", groups: "ULI", committees: "Development Council", meetingSchedule: "1st Wednesday", meetingsAttended: 2, totalMeetings: 3 },
    { id: null as string | null, salesRep: "Lisa Brown", groups: "CCIM, CREW", committees: "Membership Committee", meetingSchedule: "3rd Monday", meetingsAttended: 3, totalMeetings: 3 },
    { id: null as string | null, salesRep: "John Smith", groups: "NAIOP", committees: "Government Affairs", meetingSchedule: "Last Friday", meetingsAttended: 2, totalMeetings: 3 }
  ]);

  const [targets, setTargets] = useState([
    { id: "1", contact_name: "Alex Johnson", contact_title: "Property Manager", company: "LV Business Center", properties: "Downtown Office Building, Henderson Complex", sales_rep: "SJ", sales_rep_name: "Sarah Johnson", notes: "Interested in landscape renovation for front entrance", created_at: new Date().toISOString(), projected_value: "150" },
    { id: "2", contact_name: "Maria Rodriguez", contact_title: "Facilities Director", company: "Westside Medical Plaza", properties: "Main Hospital Campus, Satellite Clinics", sales_rep: "MC", sales_rep_name: "Mike Chen", notes: "Meeting scheduled for next month to discuss maintenance contract renewal", created_at: new Date().toISOString(), projected_value: "220" },
    { id: "3", contact_name: "Thomas Wu", contact_title: "Property Owner", company: "Wu Properties LLC", properties: "Retail Plaza on Charleston", sales_rep: "LB", sales_rep_name: "Lisa Brown", notes: "Looking for quotes on irrigation system upgrades", created_at: new Date().toISOString(), projected_value: "80" }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRep, setSelectedRep] = useState('');

  const handleTabChange = (value: string) => {
    if (value !== activeTab) {
      if (activeTab === "level10" && isFormModified) {
        const cacheKey = `level10_${selectedWeek}`;
        console.log('Saving form data to cache before tab change:', cacheKey, formData);
        setCachedFormData(prev => ({
          ...prev,
          [cacheKey]: {
            formData: { ...formData },
            selectedDate,
            currentMeetingId
          }
        }));
        setIsFormModified(false);
      }
      if (!visitedTabs.includes(value)) {
        setVisitedTabs(prev => [...prev, value]);
      }
      setActiveTab(value);
    }
  };

  useEffect(() => {
    const generateWeekOptions = () => {
      const options = [];
      const today = new Date();
      for (let i = -12; i <= 4; i++) {
        const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 4);
        options.push({
          value: format(weekStart, 'yyyy-MM-dd'),
          label: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
        });
      }
      setWeekOptions(options);
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      setSelectedWeek(format(currentWeekStart, 'yyyy-MM-dd'));
    };
    generateWeekOptions();
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      if (!supabase) {
        setConnectionError('Supabase client could not be initialized. Check your environment variables.');
        return;
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
        } else {
          console.log('Database connection test successful');
          setConnectionError(null);
        }
      } catch (error) {
        console.error('Failed to check database connection:', error);
        setConnectionError(`Failed to connect to database: ${error.message || 'Unknown error'}`);
      }
    };
    checkConnection();
  }, [supabase]);

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
  }, [activeTab, selectedWeek, connectionError, cachedFormData]);

  const fetchMeetingForWeek = async (weekStartDate) => {
    const lastSaveTime = window.localStorage.getItem('lastSaveTime');
    if (lastSaveTime && (new Date().getTime() - parseInt(lastSaveTime)) < 2000) {
      console.log('Skipping fetch right after save (within 2 seconds of save)');
      return;
    }
    if (!supabase) return;
    const cacheKey = `level10_${weekStartDate}`;
    if (cachedFormData[cacheKey]) {
      console.log('Using cached data for', cacheKey);
      setFormData(cachedFormData[cacheKey].formData);
      setSelectedDate(cachedFormData[cacheKey].selectedDate);
      setCurrentMeetingId(cachedFormData[cacheKey].currentMeetingId);
      return;
    }
    setIsLoading(true);
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
          console.log('Using mock data for level10_meetings');
          return;
        }
        throw error;
      }
      console.log('Meeting data for week:', data);
      if (data && data.length > 0) {
        console.log('Setting form data from database:', data[0]);
        const newFormData = {
          attendees: data[0].attendees || '',
          safetyMessage: data[0].safety_message || '',
          encoreValues: data[0].encore_values || '',
          closingDeals: data[0].closing_deals || '',
          biddingDeals: data[0].bidding_deals || ''
        };
        setFormData(newFormData);
        if (data[0].meeting_date) {
          setSelectedDate(new Date(data[0].meeting_date));
        }
        setCurrentMeetingId(data[0].id);
        setCachedFormData(prev => ({
          ...prev,
          [cacheKey]: {
            formData: newFormData,
            selectedDate: data[0].meeting_date ? new Date(data[0].meeting_date) : new Date(weekStartDate),
            currentMeetingId: data[0].id
          }
        }));
      } else {
        const weekDate = new Date(weekStartDate);
        const resetFormData = {
          attendees: '',
          safetyMessage: '',
          encoreValues: '',
          closingDeals: '',
          biddingDeals: ''
        };
        setFormData(resetFormData);
        setSelectedDate(weekDate);
        setCurrentMeetingId(null);
        setCachedFormData(prev => ({
          ...prev,
          [cacheKey]: {
            formData: resetFormData,
            selectedDate: weekDate,
            currentMeetingId: null
          }
        }));
      }
      setIsFormModified(false);
    } catch (error) {
      console.error('Error in fetchMeetingForWeek:', error);
      setTabErrors(prev => ({
        ...prev,
        level10: {
          message: 'Failed to fetch meeting data',
          details: error
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsFormModified(true);
  };

  const handleTargetSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleRepFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRep(e.target.value);
  };

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
        const meetingData = {
          meeting_date: selectedDate?.toISOString(),
          week_start_date: selectedWeek,
          attendees: formData.attendees,
          safety_message: formData.safetyMessage,
          encore_values: formData.encoreValues,
          closing_deals: formData.closingDeals,
          bidding_deals: formData.biddingDeals,
          updated_at: new Date().toISOString()
        };
        console.log('Saving Level 10 meeting data:', meetingData);
        let result;
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
        const { data, error } = result;
        if (error) {
          console.error('Error saving Level 10 meeting to Supabase:', error);
          throw error;
        }
        console.log('Level 10 meeting save successful, response:', data);
        if (data && data.length > 0) {
          console.log('Save successful - using current form values to prevent mismatch');
          setCurrentMeetingId(data[0].id);
          const saveTime = new Date().getTime();
          window.localStorage.setItem('lastSaveTime', saveTime.toString());
          const cacheKey = `level10_${selectedWeek}`;
          setCachedFormData(prev => ({
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
          const yearlyGoalsData = {
            year: yearlyGoals.year,
            revenue_target: parseFloat(yearlyGoals.revenueTarget) * 1000000,
            revenue_description: yearlyGoals.revenueDescription,
            retention_goal: parseFloat(yearlyGoals.retentionGoal),
            retention_description: yearlyGoals.retentionDescription,
            updated_at: new Date().toISOString()
          };
          console.log('Saving yearly goals data:', yearlyGoalsData);
          let yearlyGoalsResult;
          if (yearlyGoals.id) {
            yearlyGoalsResult = await supabase
              .from('yearly_goals')
              .update(yearlyGoalsData)
              .eq('id', yearlyGoals.id)
              .select();
          } else {
            yearlyGoalsResult = await supabase
              .from('yearly_goals')
              .insert(yearlyGoalsData)
              .select();
          }
          if (yearlyGoalsResult.error) {
            console.error('Error saving yearly goals:', yearlyGoalsResult.error);
            throw yearlyGoalsResult.error;
          }
          if (yearlyGoalsResult.data && yearlyGoalsResult.data.length > 0) {
            setYearlyGoals(prev => ({ ...prev, id: yearlyGoalsResult.data[0].id }));
          }
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
                setIssuesList(prev => 
                  prev.map(i => 
                    i.issueText === issue.issueText && i.id === null
                      ? { ...i, id: data[0].id }
                      : i
                  )
                );
              }
            }
          }
          const creGroupsData = {
            title: quarterlyRocks.creGroups.title,
            category: 'CRE Groups',
            assigned_to: quarterlyRocks.creGroups.assignedTo,
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
              setQuarterlyRocks(prev => ({
                ...prev,
                creGroups: { ...prev.creGroups, id: data[0].id }
              }));
            }
          }
          const productionRatesData = {
            title: quarterlyRocks.productionRates.title,
            category: 'Production',
            assigned_to: quarterlyRocks.productionRates.assignedTo,
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
              setQuarterlyRocks(prev => ({
                ...prev,
                productionRates: { ...prev.productionRates, id: data[0].id }
              }));
            }
          }
          const puttingWorld = { name: "Putting World Event", date: "", location: "", attendance: 0, budget_status: "", activities: [] };
          const lvCharcuterie = { name: "LV Charcuterie Event", date: "", location: "", attendance: 0, budget_status: "", activities: [] };
          const puttingWorldLines = quarterlyRocks.events.puttingWorldEvent.split('\n');
          puttingWorldLines.forEach(line => {
            if (line.startsWith('Date:')) puttingWorld.date = line.replace('Date:', '').trim();
            else if (line.startsWith('Location:')) puttingWorld.location = line.replace('Location:', '').trim();
            else if (line.startsWith('Expected Attendance:')) puttingWorld.attendance = parseInt(line.replace('Expected Attendance:', '').trim()) || 0;
            else if (line.startsWith('Budget Status:')) puttingWorld.budget_status = line.replace('Budget Status:', '').trim();
            else if (line.startsWith('- ')) puttingWorld.activities.push(line.replace('- ', '').trim());
          });
          const lvCharcuterieLines = quarterlyRocks.events.lvCharcuterieEvent.split('\n');
          lvCharcuterieLines.forEach(line => {
            if (line.startsWith('Date:')) lvCharcuterie.date = line.replace('Date:', '').trim();
            else if (line.startsWith('Location:')) lvCharcuterie.location = line.replace('Location:', '').trim();
            else if (line.startsWith('Expected Attendance:')) lvCharcuterie.attendance = parseInt(line.replace('Expected Attendance:', '').trim()) || 0;
            else if (line.startsWith('Budget Status:')) lvCharcuterie.budget_status = line.replace('Budget Status:', '').trim();
            else if (line.startsWith('- ')) lvCharcuterie.activities.push(line.replace('- ', '').trim());
          });
          const eventsData = {
            title: quarterlyRocks.events.title,
            category: 'Events',
            assigned_to: quarterlyRocks.events.assignedTo,
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
              setQuarterlyRocks(prev => ({
                ...prev,
                events: { ...prev.events, id: data[0].id }
              }));
            }
          }
        } catch (vtoError) {
          console.error('Error saving VTO data:', vtoError);
          throw vtoError;
        }
      } else if (activeTab === "presentations") {
        try {
          console.log('Saving meeting guidelines:', meetingGuidelines);
          for (const guideline of meetingGuidelines) {
            const guidelineData = {
              guideline_text: guideline.guidelineText,
              category: guideline.category,
              sort_order: guideline.sortOrder,
              week_start_date: selectedWeek,
              updated_at: new Date().toISOString()
            };
            if (guideline.id) {
              const { error } = await supabase
                .from('meeting_guidelines')
                .update(guidelineData)
                .eq('id', guideline.id);
              if (error) {
                console.error('Error updating guideline:', error);
                throw error;
              }
            } else {
              const { data, error } = await supabase
                .from('meeting_guidelines')
                .insert(guidelineData)
                .select();
              if (error) {
                console.error('Error inserting guideline:', error);
                throw error;
              }
              if (data && data.length > 0) {
                setMeetingGuidelines(prev => 
                  prev.map(g => 
                    g.guidelineText === guideline.guidelineText && g.id === null
                      ? { ...g, id: data[0].id }
                      : g
                  )
                );
              }
            }
          }
          console.log('Saving objection handling:', objectionHandling);
          for (const objection of objectionHandling) {
            const objectionData = {
              objection: objection.objection,
              rebuttal: objection.rebuttal,
              things_to_say: objection.thingsToSay,
              things_not_to_say: objection.thingsNotToSay,
              updated_at: new Date().toISOString()
            };
            if (objection.id) {
              const { error } = await supabase
                .from('objection_handling')
                .update(objectionData)
                .eq('id', objection.id);
              if (error) {
                console.error('Error updating objection:', error);
                throw error;
              }
            } else {
              const { data, error } = await supabase
                .from('objection_handling')
                .insert(objectionData)
                .select();
              if (error) {
                console.error('Error inserting objection:', error);
                throw error;
              }
              if (data && data.length > 0) {
                setObjectionHandling(prev => 
                  prev.map(o => 
                    o.objection === objection.objection && o.id === null
                      ? { ...o, id: data[0].id }
                      : o
                  )
                );
              }
            }
          }
          console.log('Saving quick tips:', quickTips);
          for (const tip of quickTips) {
            const tipData = {
              category: tip.category,
              tip_text: tip.tipText,
              updated_at: new Date().toISOString()
            };
            if (tip.id) {
              const { error } = await supabase
                .from('quick_tips')
                .update(tipData)
                .eq('id', tip.id);
              if (error) {
                console.error('Error updating quick tip:', error);
                throw error;
              }
            } else {
              const { data, error } = await supabase
                .from('quick_tips')
                .insert(tipData)
                .select();
              if (error) {
                console.error('Error inserting quick tip:', error);
                throw error;
              }
              if (data && data.length > 0) {
                setQuickTips(prev => 
                  prev.map(t => 
                    t.category === tip.category && t.tipText === tip.tipText && t.id === null
                      ? { ...t, id: data[0].id }
                      : t
                  )
                );
              }
            }
          }
        } catch (presentationsError) {
          console.error('Error saving Presentations data:', presentationsError);
          throw presentationsError;
        }
      } else if (activeTab === "memberships") {
        try {
          console.log('Saving memberships data:', memberships);
          for (const membership of memberships) {
            const membershipData = {
              sales_rep: membership.salesRep,
              groups: membership.groups,
              committees: membership.committees,
              meeting_schedule: membership.meetingSchedule,
              meetings_attended: membership.meetingsAttended,
              total_meetings: membership.totalMeetings,
              week_start_date: selectedWeek,
              updated_at: new Date().toISOString()
            };
            if (membership.id) {
              const { error } = await supabase
                .from('association_memberships')
                .update(membershipData)
                .eq('id', membership.id);
              if (error) {
                console.error('Error updating membership:', error);
                throw error;
              }
            } else {
              const { data, error } = await supabase
                .from('association_memberships')
                .insert(membershipData)
                .select();
              if (error) {
                console.error('Error inserting membership:', error);
                throw error;
              }
              if (data && data.length > 0) {
                setMemberships(prev => 
                  prev.map(m => 
                    m.salesRep === membership.salesRep && m.id === null
                      ? { ...m, id: data[0].id }
                      : m
                  )
                );
              }
            }
          }
        } catch (membershipsError) {
          console.error('Error saving Memberships data:', membershipsError);
          throw membershipsError;
        }
      } else if (activeTab === "targetList") {
        try {
          console.log('Saving targets data:', targets);
          for (const target of targets) {
            const targetData = {
              id: target.id,
              contact_name: target.contact_name,
              contact_title: target.contact_title,
              company: target.company,
              properties: target.properties,
              sales_rep: target.sales_rep,
              sales_rep_name: target.sales_rep_name,
              notes: target.notes,
              status: target.status || 'active',
              projected_value: target.projected_value,
              updated_at: new Date().toISOString()
            };
            if (!target.id.includes('-')) {
              delete targetData.id;
              const { data, error } = await supabase
                .from('targets')
                .insert(targetData)
                .select();
              if (error) {
                console.error('Error inserting target:', error);
                throw error;
              }
              if (data && data.length > 0) {
                setTargets(prev => 
                  prev.map(t => 
                    t.id === target.id ? { ...t, id: data[0].id } : t
                  )
                );
              }
            } else {
              const { error } = await supabase
                .from('targets')
                .update(targetData)
                .eq('id', target.id);
              if (error) {
                console.error('Error updating target:', error);
                throw error;
              }
            }
          }
        } catch (targetsError) {
          console.error('Error saving Targets data:', targetsError);
          throw targetsError;
        }
      }
      console.log(`Successfully saved ${activeTab} data`);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving data:', error);
      setSaveStatus('error');
      setTabErrors(prev => ({
        ...prev,
        [activeTab]: {
          message: `Failed to save ${activeTab} data`,
          details: error
        }
      }));
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWeekChange = (value: string) => {
    if (activeTab === "level10" && isFormModified) {
      const cacheKey = `level10_${selectedWeek}`;
      console.log('Saving form data to cache before week change:', cacheKey, formData);
      setCachedFormData(prev => ({
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

  const saveTarget = async (updateFn: (prev: any[]) => any[]) => {
    const updatedTargets = updateFn([...targets]);
    setTargets(updatedTargets);
    setSaveStatus('saving');
    if (!supabase) {
      console.error('Cannot save target - Supabase client not initialized');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 1500);
      return;
    }
    try {
      const changedTargets = updatedTargets.filter(newTarget => {
        const oldTarget = targets.find(t => t.id === newTarget.id);
        if (!oldTarget) return true;
        return JSON.stringify(oldTarget) !== JSON.stringify(newTarget);
      });
      if (changedTargets.length === 0) {
        console.log('No targets changed, skipping save');
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 1500);
        return;
      }
      console.log('Saving changed targets:', changedTargets);
      for (const target of changedTargets) {
        const targetData = {
          contact_name: target.contact_name,
          contact_title: target.contact_title,
          company: target.company,
          properties: target.properties,
          sales_rep: target.sales_rep,
          sales_rep_name: target.sales_rep_name,
          notes: target.notes,
          status: target.status || 'active',
          projected_value: target.projected_value,
          updated_at: new Date().toISOString()
        };
        if (target.id && !target.id.includes('-')) {
          console.log('Inserting new target');
          const { data, error } = await supabase
            .from('targets')
            .insert(targetData)
            .select();
          if (error) {
            console.error('Error inserting target:', error);
            throw error;
          }
          if (data && data.length > 0) {
            setTargets(prev => prev.map(t => t.id === target.id ? {...t, id: data[0].id} : t));
          }
        } else {
          console.log('Updating existing target:', target.id);
          const { error } = await supabase
            .from('targets')
            .update(targetData)
            .eq('id', target.id);
          if (error) {
            console.error('Error updating target:', error);
            throw error;
          }
        }
      }
      const deletedTargets = targets.filter(oldTarget => !updatedTargets.some(newTarget => newTarget.id === oldTarget.id));
      for (const target of deletedTargets) {
        if (target.id && target.id.includes('-')) {
          console.log('Deleting target:', target.id);
          const { error } = await supabase
            .from('targets')
            .delete()
            .eq('id', target.id);
          if (error) {
            console.error('Error deleting target:', error);
            throw error;
          }
        }
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (error) {
      console.error('Error saving target:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 1500);
      setTabErrors(prev => ({
        ...prev,
        targetList: {
          message: 'Failed to save target',
          details: error
        }
      }));
    }
  };

  const filteredTargets = targets.filter(target => {
    const matchesSearch = searchQuery === '' || 
      target.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      target.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      target.properties?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      target.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRep = selectedRep === '' || target.sales_rep === selectedRep;
    return matchesSearch && matchesRep;
  });

  const setupDatabase = async () => {
    if (!supabase) return;
    setIsLoading(true);
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
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        -- Yearly Goals table
        CREATE TABLE IF NOT EXISTS yearly_goals (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          year INT,
          revenue_target NUMERIC,
          revenue_description TEXT,
          retention_goal NUMERIC,
          retention_description TEXT,
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
      fetchData();
    } catch (error) {
      console.error('Failed to set up database:', error);
      alert(`Failed to set up database: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    console.log('Fetching data for tab:', activeTab);
    if (activeTab === "level10") {
      await fetchMeetingForWeek(selectedWeek);
    } else if (activeTab === "vto") {
      console.log('Fetching VTO data...');
    } else if (activeTab === "presentations") {
      console.log('Fetching presentations data...');
    } else if (activeTab === "memberships") {
      console.log('Fetching memberships data...');
    } else if (activeTab === "targetList") {
      console.log('Fetching target list data...');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">BD Meeting Agenda</h1>
          {!connectionError && (
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex items-center border border-gray-200 rounded-md p-2 bg-white">
                  <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                  <select 
                    className="outline-none border-none bg-transparent pr-8 text-sm font-medium"
                    value={selectedWeek} 
                    onChange={(e) => handleWeekChange(e.target.value)}
                  >
                    {weekOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 transition-all duration-200 transform hover:scale-105"
              onClick={saveData}
              disabled={isSaving}
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Changes</>
              )}
            </Button>
          </div>
        )}
      </div>

      {connectionError ? (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-red-200">
          <div className="flex items-center text-red-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
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
                  <li>Navigate to Project Settings > API</li>
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
                setConnectionError(null);
                try {
                  console.log('Verifying database access...');
                  
                  if (!supabase) {
                    throw new Error('Supabase client is not initialized');
                  }
                  
                  // Try a more direct query to verify database connection
                  const { data, error } = await supabase
                    .from('level10_meetings')
                    .select('count');
                  
                  if (error) {
                    console.error('Database access verification failed:', error);
                    
                    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
                      setConnectionError('Database is accessible, but tables do not exist. Please create the required tables.');
                    } else {
                      throw error;
                    }
                  } else {
                    setConnectionError(null);
                    alert('Database connection verified successfully!');
                    fetchData();
                  }
                } catch (error: any) {
                  console.error('Database verification failed:', error);
                  setConnectionError(error.message || 'Unknown database access error');
                }
              }}
            >
              Verify Database Access
            </Button>
            
            {connectionError?.includes('tables do not exist') && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={setupDatabase}
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
              <TabsContent value="level10">
                <div className="space-y-8">
                  <SectionHeader title="Level 10 Meeting Tracker" />
                  
                  {/* Level 10 content - same as original but with better error handling */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-sm font-medium text-gray-700">Meeting Date</h3>
      {/* Status indicators */}
    </div>
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={(date) => {
        setSelectedDate(date);
        // Mark as modified and cache immediately
        if (date !== selectedDate) {
          setIsFormModified(true);
        }
      }}
      className="w-full"
      classNames={{
        day_selected: "bg-blue-600 text-white hover:bg-blue-700",
        day_today: "bg-gray-100 font-bold",
        day: "hover:bg-gray-100 transition-colors",
        head_cell: "text-sm font-medium text-gray-600",
        table: "w-full border-collapse space-y-1",
        cell: "text-center p-0 relative [&:has([aria-selected])]:bg-blue-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        nav_button: "border rounded-lg p-1 hover:bg-gray-100 transition-colors",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        caption: "relative py-4 text-sm font-medium"
      }}
    />
  </div>
  {/* Replace the second Calendar with some other content */}
  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-sm font-medium text-gray-700">Meeting Details</h3>
    </div>
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-600">Selected Date:</p>
        <p className="font-medium">{selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'None'}</p>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">Week Range:</p>
        <p className="font-medium">{selectedWeek ? weekOptions.find(opt => opt.value === selectedWeek)?.label : 'Current Week'}</p>
      </div>
    </div>
  </div>
</div>
                    
                    <div className="space-y-6 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                      <FormField
                        label="Attendees"
                        name="attendees"
                        value={formData.attendees}
                        onChange={handleInputChange}
                        placeholder="Enter attendees"
                      />
                      <FormField
                        label="Safety Message"
                        name="safetyMessage"
                        value={formData.safetyMessage}
                        onChange={handleInputChange}
                        placeholder="Enter safety message of the week"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                    <FormField
                      label="EnCore Values/Sales Story"
                      name="encoreValues"
                      value={formData.encoreValues}
                      onChange={handleInputChange}
                      placeholder="Share success story or learning experience"
                      isTextArea
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                      <FormField
                        label="What We're Closing (10 minutes)"
                        name="closingDeals"
                        value={formData.closingDeals}
                        onChange={handleInputChange}
                        placeholder="Update on deals close to signing"
                        isTextArea
                      />
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                      <FormField
                        label="What We're Bidding (20 minutes)"
                        name="biddingDeals"
                        value={formData.biddingDeals}
                        onChange={handleInputChange}
                        placeholder="Current bid status and updates"
                        isTextArea
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Other tab contents remain the same */}
              <TabsContent value="vto" className="space-y-6">
                {/* Yearly Goals Section - using default data for now */}
                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                  <SectionHeader title="2025 Yearly Goals" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-green-100 transition-all duration-200 hover:shadow-md">
                      <div className="text-sm text-gray-600 mb-2">Revenue Target</div>
                      <div className="text-3xl font-bold text-green-700">$3.25M</div>
                      <div className="text-sm text-gray-600 mt-1">new maintenance</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-green-100 transition-all duration-200 hover:shadow-md">
                      <div className="text-sm text-gray-600 mb-2">Retention Goal</div>
                      <div className="text-3xl font-bold text-green-700">90%</div>
                      <div className="text-sm text-gray-600 mt-1">customer retention</div>
                    </div>
                  </div>
                </div>
                
                {/* Issues List */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <SectionHeader title="Issues List" />
                  <div className="space-y-4">
                    {issuesList.map((issue, index) => (
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
                        <span className="text-gray-700">{issue.issueText}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quarterly Rocks Section */}
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                  <SectionHeader title="Quarterly Rocks" />
                  <div className="space-y-6">
                    {/* CRE Groups & Committees */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-800">{quarterlyRocks.creGroups.title}</h3>
                        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mt-2 sm:mt-0">
                          Assigned: {quarterlyRocks.creGroups.assignedTo}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <label className="text-sm font-medium">Current Groups</label>
                          <textarea 
                            className="mt-2 w-full rounded-xl border border-gray-200 p-3 min-h-24"
                            placeholder="List current CRE group memberships"
                            value={quarterlyRocks.creGroups.currentGroups}
                            onChange={(e) => {
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
                            onChange={(e) => {
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

                    {/* Other quarterly rocks sections remain similar */}
                  </div>
                </div>
              </TabsContent>
              
              {/* Presentations Tab Content */}
              <TabsContent value="presentations">
                <div className="space-y-6">
                  {/* Guidelines Section */}
                  <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                    <SectionHeader title="Notes/Always bring to a meeting:" />
                    <ul className="space-y-3 text-purple-900">
                      {meetingGuidelines.map((guideline, index) => (
                        <li key={index} className="flex items-start p-3 bg-white rounded-lg border border-purple-100">
                          <span className="mr-3 text-purple-500">•</span>
                          {guideline.guidelineText}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Objection Handling Table */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b bg-white">
                      <h3 className="text-lg font-bold text-gray-800">Objection Handling</h3>
                      <Button 
                        className="bg-purple-600 hover:bg-purple-700 text-white mt-3 sm:mt-0"
                        onClick={() => {
                          setObjectionHandling([
                            ...objectionHandling,
                            {
                              id: null,
                              objection: "New objection",
                              rebuttal: "How to handle it",
                              thingsToSay: "Recommended phrases",
                              thingsNotToSay: "Phrases to avoid"
                            }
                          ]);
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
                          {objectionHandling.map((objection, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="p-4">{objection.objection}</td>
                              <td className="p-4">{objection.rebuttal}</td>
                              <td className="p-4">
                                <ul className="list-disc pl-4 text-sm space-y-1">
                                  {objection.thingsToSay.split("\n").map((item, i) => (
                                    <li key={i}>{item}</li>
                                  ))}
                                </ul>
                              </td>
                              <td className="p-4 text-red-600">
                                <ul className="list-disc pl-4 text-sm space-y-1">
                                  {objection.thingsNotToSay.split("\n").map((item, i) => (
                                    <li key={i}>{item}</li>
                                  ))}
                                </ul>
                              </td>
                              <td className="p-4">
                                <Button variant="ghost" size="sm">Edit</Button>
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
                      {quickTips.map((tip, index) => (
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
                    <h2 className="text-xl font-bold">Association Memberships</h2>
                    <Button 
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => {
                        setMemberships([
                          ...memberships,
                          {
                            id: null,
                            salesRep: "New Rep",
                            groups: "",
                            committees: "",
                            meetingSchedule: "",
                            meetingsAttended: 0,
                            totalMeetings: 0
                          }
                        ]);
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
                        {memberships.map((membership, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3">{membership.salesRep}</td>
                            <td className="p-3">{membership.groups}</td>
                            <td className="p-3">{membership.committees}</td>
                            <td className="p-3">{membership.meetingSchedule}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-sm ${
                                membership.meetingsAttended === membership.totalMeetings
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {membership.meetingsAttended}/{membership.totalMeetings}
                              </span>
                            </td>
                            <td className="p-3">
                              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">Edit</Button>
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
                          {new Set(memberships.flatMap(m => m.groups.split(',').map(g => g.trim()))).size}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-orange-100 transition-all duration-200 hover:shadow-md">
                        <div className="text-sm text-gray-600">Meeting Attendance</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold">
                            {Math.round(
                              (memberships.reduce((sum, m) => sum + m.meetingsAttended, 0) / 
                               memberships.reduce((sum, m) => sum + m.totalMeetings, 0)) * 100
                            )}
                          </span>
                          <span className="text-gray-600">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Target List Tab Content */}
              <TabsContent value="targetList">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800">Target Prospect List</h2>
                    <Button 
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => {
                        const newTarget = {
                          id: Date.now().toString(),
                          contact_name: "New Contact",
                          contact_title: "Position",
                          company: "New Company",
                          properties: "Property 1",
                          sales_rep: "SJ",
                          sales_rep_name: "Sarah Johnson",
                          notes: "New prospect notes",
                          created_at: new Date().toISOString(),
                          projected_value: "0"
                        };
                        saveTarget(prevTargets => [...prevTargets, newTarget]);
                      }}
                    >
                      + Add Target
                    </Button>
                  </div>
                  
                  {/* Search & Filter */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <Input 
                          placeholder="Search targets..." 
                          className="border-red-200 focus:border-red-400 focus:ring-red-200"
                          value={searchQuery}
                          onChange={handleTargetSearch}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <select 
                          className="p-2 rounded-lg border border-gray-200 text-sm"
                          value={selectedRep}
                          onChange={handleRepFilter}
                        >
                          <option value="">All Sales Reps</option>
                          <option value="SJ">Sarah Johnson</option>
                          <option value="MC">Mike Chen</option>
                          <option value="LB">Lisa Brown</option>
                          <option value="JS">John Smith</option>
                        </select>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedRep('');
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Targets List */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-red-50 p-4 border-b border-red-100">
                      <h3 className="font-medium text-red-800">Priority Targets</h3>
                    </div>
                    {filteredTargets.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        {searchQuery || selectedRep ? 
                          "No targets match your search criteria." : 
                          "No targets found. Click the 'Add Target' button to create your first target."}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-red-50">
                              <th className="p-3 text-left font-medium text-gray-700">Contact</th>
                              <th className="p-3 text-left font-medium text-gray-700">Company</th>
                              <th className="p-3 text-left font-medium text-gray-700">Property(s)</th>
                              <th className="p-3 text-left font-medium text-gray-700">Sales Rep</th>
                              <th className="p-3 text-left font-medium text-gray-700">Notes</th>
                              <th className="p-3 text-left font-medium text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTargets.map(target => (
                              <tr key={target.id} className="border-b hover:bg-red-50 transition-colors">
                                <td className="p-3">
                                  <Input
                                    className="font-medium border-0 hover:border hover:border-red-200 p-0 hover:p-1 focus:border focus:border-red-400"
                                    defaultValue={target.contact_name}
                                    onBlur={(e) => {
                                      if (e.target.value !== target.contact_name) {
                                        const updatedTarget = {...target, contact_name: e.target.value};
                                        saveTarget(prevTargets => 
                                          prevTargets.map(t => t.id === target.id ? updatedTarget : t)
                                        );
                                      }
                                    }}
                                  />
                                  <Input
                                    className="text-sm text-gray-500 border-0 hover:border hover:border-red-200 p-0 hover:p-1 mt-1 focus:border focus:border-red-400"
                                    defaultValue={target.contact_title}
                                    onBlur={(e) => {
                                      if (e.target.value !== target.contact_title) {
                                        const updatedTarget = {...target, contact_title: e.target.value};
                                        saveTarget(prevTargets => 
                                          prevTargets.map(t => t.id === target.id ? updatedTarget : t)
                                        );
                                      }
                                    }}
                                  />
                                </td>
                                <td className="p-3">
                                  <Input
                                    className="border-0 hover:border hover:border-red-200 p-0 hover:p-1 focus:border focus:border-red-400"
                                    defaultValue={target.company}
                                    onBlur={(e) => {
                                      if (e.target.value !== target.company) {
                                        const updatedTarget = {...target, company: e.target.value};
                                        saveTarget(prevTargets => 
                                          prevTargets.map(t => t.id === target.id ? updatedTarget : t)
                                        );
                                      }
                                    }}
                                  />
                                </td>
                                <td className="p-3">
                                  <textarea
                                    className="w-full border-0 hover:border hover:border-red-200 p-0 hover:p-1 resize-none h-16 focus:border focus:border-red-400 focus:ring-0"
                                    defaultValue={target.properties}
                                    onBlur={(e) => {
                                      if (e.target.value !== target.properties) {
                                        const updatedTarget = {...target, properties: e.target.value};
                                        saveTarget(prevTargets => 
                                          prevTargets.map(t => t.id === target.id ? updatedTarget : t)
                                        );
                                      }
                                    }}
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 ${
                                      target.sales_rep === 'SJ' ? 'bg-blue-100 text-blue-600' :
                                      target.sales_rep === 'MC' ? 'bg-green-100 text-green-600' :
                                      target.sales_rep === 'LB' ? 'bg-purple-100 text-purple-600' :
                                      'bg-orange-100 text-orange-600'
                                    } rounded-full flex items-center justify-center font-medium`}>
                                      {target.sales_rep}
                                    </div>
                                    <select 
                                      className="border-0 hover:border hover:border-red-200 p-0 hover:p-1 focus:border focus:border-red-400 focus:ring-0 bg-transparent"
                                      defaultValue={target.sales_rep}
                                      onChange={(e) => {
                                        const rep = e.target.value;
                                        const repName = rep === 'SJ' ? 'Sarah Johnson' :
                                                      rep === 'MC' ? 'Mike Chen' :
                                                      rep === 'LB' ? 'Lisa Brown' :
                                                      'John Smith';
                                        
                                        const updatedTarget = {
                                          ...target, 
                                          sales_rep: rep,
                                          sales_rep_name: repName
                                        };
                                        saveTarget(prevTargets => 
                                          prevTargets.map(t => t.id === target.id ? updatedTarget : t)
                                        );
                                      }}
                                    >
                                      <option value="SJ">Sarah Johnson</option>
                                      <option value="MC">Mike Chen</option>
                                      <option value="LB">Lisa Brown</option>
                                      <option value="JS">John Smith</option>
                                    </select>
                                  </div>
                                </td>
                                <td className="p-3 max-w-xs">
                                  <textarea
                                    className="w-full text-sm border-0 hover:border hover:border-red-200 p-0 hover:p-1 resize-none h-16 focus:border focus:border-red-400 focus:ring-0"
                                    defaultValue={target.notes}
                                    onBlur={(e) => {
                                      if (e.target.value !== target.notes) {
                                        const updatedTarget = {...target, notes: e.target.value};
                                        saveTarget(prevTargets => 
                                          prevTargets.map(t => t.id === target.id ? updatedTarget : t)
                                        );
                                      }
                                    }}
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-red-600 hover:text-red-800 p-1 h-auto"
                                      onClick={() => {
                                        setTargets(prevTargets => prevTargets.filter(t => t.id !== target.id));
                                      }}
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
                    )}
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Total Targets</div>
                      <div className="text-2xl font-bold">{targets.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Active Prospects</div>
                      <div className="text-2xl font-bold">
                        {targets.filter(t => t.status === 'active' || !t.status).length}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Proposals Out</div>
                      <div className="text-2xl font-bold">
                        {targets.filter(t => t.status === 'proposal').length}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Projected Value</div>
                      <div className="text-2xl font-bold text-green-600">
                        ${targets.reduce((sum, t) => sum + (parseFloat(t.projected_value || '0') || 0), 0).toLocaleString('en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}K
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
      )}
    </div>
  </div>
);
};

export default BDDashboard;