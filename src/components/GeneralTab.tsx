import React, { useState, useEffect } from 'react';
import { 
  Clipboard, 
  MessageCircle, 
  CheckSquare, 
  FileText, 
  Lightbulb, 
  X, 
  Plus,
  Save
} from 'lucide-react';
import { Button } from "@/components/ui/button";

// Define types for our data
interface DiscussionTopic {
    id: string | null; // Now accepts null as well
    title: string;
    duration: string;
    notes: string;
  }

interface ActionItem {
    id: string | null;
  text: string;
  completed: boolean;
  assignedTo: string;
}

interface Process {
    id: string | null;
  title: string;
  description: string;
}

// Define props interface
interface GeneralTabProps {
  initialDiscussionTopics?: DiscussionTopic[];
  initialActionItems?: ActionItem[];
  initialProcesses?: Process[];
  initialIdeasText?: string;
  weekStartDate: string;
  onSaveData?: (data: {
    discussionTopics: DiscussionTopic[];
    actionItems: ActionItem[];
    processes: Process[];
    ideasText: string;
  }) => Promise<void>;
  isSaving?: boolean;
}




const GeneralTab: React.FC<GeneralTabProps> = ({
  initialDiscussionTopics = [],
  initialActionItems = [],
  initialProcesses = [],
  initialIdeasText = "",
  weekStartDate,
  onSaveData,
  isSaving = false
}) => {
  // State with default fallbacks
  const [discussionTopics, setDiscussionTopics] = useState<DiscussionTopic[]>(
    initialDiscussionTopics.length > 0 ? initialDiscussionTopics : [
      { id: "temp-1", title: "General discussion", duration: "5 minutes", notes: "Weekly updates and announcements" },
      { id: "temp-2", title: "HOAs w Front Yards", duration: "3 minutes", notes: "Strategy for approaching front yard maintenance" }
    ]
  );

  const [actionItems, setActionItems] = useState<ActionItem[]>(
    initialActionItems.length > 0 ? initialActionItems : [
      { id: "temp-1", text: "Deliver Beanies to clients", completed: false, assignedTo: "Sarah" },
      { id: "temp-2", text: "Use due date in Aspire for proper reporting", completed: true, assignedTo: "Team" },
      { id: "temp-3", text: "Frame Prologis Pics", completed: false, assignedTo: "John" },
      { id: "temp-4", text: "Review Slack BD channel", completed: false, assignedTo: "All" }
    ]
  );

  const [processes, setProcesses] = useState<Process[]>(
    initialProcesses.length > 0 ? initialProcesses : [
      { id: "temp-1", title: "JOB START UP WALKS/PROCESS", description: "Procedure for blowing of landscaped areas and initial job setup requirements" },
      { id: "temp-2", title: "ESTIMATING PROCESS", description: "Standard procedure for accurate estimating using the Estimating Sheet" }
    ]
  );

  const [ideasText, setIdeasText] = useState(
    initialIdeasText || "Christmas Gifts - Zoo, Ethel M, Aviators stadium?\nRole Play - what makes you different?\nImportance of retention w current clients - don't hound them for new bids, just be friends"
  );
  
  const [isDataModified, setIsDataModified] = useState(false);

  // Update state when props change
  useEffect(() => {
    if (initialDiscussionTopics.length > 0) {
      setDiscussionTopics(initialDiscussionTopics);
    }
    if (initialActionItems.length > 0) {
      setActionItems(initialActionItems);
    }
    if (initialProcesses.length > 0) {
      setProcesses(initialProcesses);
    }
    if (initialIdeasText) {
      setIdeasText(initialIdeasText);
    }
    setIsDataModified(false);
  }, [initialDiscussionTopics, initialActionItems, initialProcesses, initialIdeasText]);

  // Add new items functions
  const addDiscussionTopic = () => {
    const newTopics = [...discussionTopics, { id: `temp-${Date.now()}`, title: "", duration: "", notes: "" }];
    setDiscussionTopics(newTopics);
    setIsDataModified(true);
  };

  const addActionItem = () => {
    const newItems = [...actionItems, { id: `temp-${Date.now()}`, text: "", completed: false, assignedTo: "" }];
    setActionItems(newItems);
    setIsDataModified(true);
  };

  const addProcess = () => {
    const newProcesses = [...processes, { id: `temp-${Date.now()}`, title: "", description: "" }];
    setProcesses(newProcesses);
    setIsDataModified(true);
  };

  // Toggle action item completion
  const toggleActionItemComplete = (index: number) => {
    const newItems = [...actionItems];
    newItems[index].completed = !newItems[index].completed;
    setActionItems(newItems);
    setIsDataModified(true);
  };

  // Handle save
  const handleSave = async () => {
    if (onSaveData) {
      await onSaveData({
        discussionTopics,
        actionItems,
        processes,
        ideasText
      });
      setIsDataModified(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-blue-100 pb-4 mb-2">
        <div className="flex items-center">
          <Clipboard className="h-7 w-7 text-blue-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-800">General <span className="text-blue-600">Topics</span></h2>
        </div>
        
        {/* Add save button when data is modified */}
        {isDataModified && (
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>
      
      {/* Discussion Topics Section */}
      <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl p-6 border border-blue-100 shadow-sm">
        <div className="flex items-center mb-4">
          <MessageCircle className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-blue-700">Discussion Topics</h3>
          <span className="ml-2 text-sm text-gray-500">(Time-boxed items for meeting)</span>
        </div>
        
        <div className="space-y-3">
          {discussionTopics.map((topic, index) => (
            <div key={topic.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-50 hover:shadow-sm transition-all">
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 font-medium text-gray-800 bg-transparent border-0 border-b border-dashed border-gray-200 focus:outline-none"
                    value={topic.title}
                    placeholder="Topic title"
                    onChange={(e) => {
                      const newTopics = [...discussionTopics];
                      newTopics[index].title = e.target.value;
                      setDiscussionTopics(newTopics);
                      setIsDataModified(true);
                    }}
                  />
                  <input
                    type="text"
                    className="w-24 text-sm text-gray-500 bg-transparent border-0 border-b border-dashed border-gray-200 focus:outline-none text-right"
                    value={topic.duration}
                    placeholder="Duration"
                    onChange={(e) => {
                      const newTopics = [...discussionTopics];
                      newTopics[index].duration = e.target.value;
                      setDiscussionTopics(newTopics);
                      setIsDataModified(true);
                    }}
                  />
                </div>
                <textarea
                  className="mt-2 w-full bg-transparent border-0 focus:outline-none text-gray-600 text-sm min-h-[40px] placeholder:text-gray-400"
                  value={topic.notes}
                  placeholder="Add notes or details about this topic..."
                  onChange={(e) => {
                    const newTopics = [...discussionTopics];
                    newTopics[index].notes = e.target.value;
                    setDiscussionTopics(newTopics);
                    setIsDataModified(true);
                  }}
                />
              </div>
              <button 
                className="p-1 h-auto text-gray-400 hover:text-red-600"
                onClick={() => {
                  setDiscussionTopics(discussionTopics.filter((_, i) => i !== index));
                  setIsDataModified(true);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          <button 
            className="w-full mt-2 border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 p-2 rounded-lg flex items-center justify-center"
            onClick={addDiscussionTopic}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Discussion Topic
          </button>
        </div>
      </div>
      
      {/* Action Items / Reminders Section */}
      <div className="bg-gradient-to-r from-green-50 to-white rounded-xl p-6 border border-green-100 shadow-sm">
        <div className="flex items-center mb-4">
          <CheckSquare className="h-5 w-5 text-green-600 mr-2" />
          <h3 className="text-lg font-medium text-green-700">Action Items & Reminders</h3>
        </div>
        
        <div className="space-y-3">
          {actionItems.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-50 hover:shadow-sm transition-all">
              <input 
                type="checkbox" 
                checked={item.completed}
                onChange={() => toggleActionItemComplete(index)}
                className="w-5 h-5 rounded border-gray-300" 
              />
              <div className="flex-grow">
                <input
                  type="text"
                  className={`w-full bg-transparent border-0 border-b border-dashed border-gray-200 focus:outline-none ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                  value={item.text}
                  placeholder="Action item or reminder"
                  onChange={(e) => {
                    const newItems = [...actionItems];
                    newItems[index].text = e.target.value;
                    setActionItems(newItems);
                    setIsDataModified(true);
                  }}
                />
              </div>
              <input
                type="text"
                className="w-24 text-sm text-gray-500 bg-transparent border-0 border-b border-dashed border-gray-200 focus:outline-none text-right"
                value={item.assignedTo}
                placeholder="Assign to"
                onChange={(e) => {
                  const newItems = [...actionItems];
                  newItems[index].assignedTo = e.target.value;
                  setActionItems(newItems);
                  setIsDataModified(true);
                }}
              />
              <button 
                className="p-1 h-auto text-gray-400 hover:text-red-600"
                onClick={() => {
                  setActionItems(actionItems.filter((_, i) => i !== index));
                  setIsDataModified(true);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          <button 
            className="w-full mt-2 border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 p-2 rounded-lg flex items-center justify-center"
            onClick={addActionItem}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Action Item
          </button>
        </div>
      </div>
      
      {/* Processes & Procedures Section */}
      <div className="bg-gradient-to-r from-purple-50 to-white rounded-xl p-6 border border-purple-100 shadow-sm">
        <div className="flex items-center mb-4">
          <FileText className="h-5 w-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-medium text-purple-700">Processes & Procedures</h3>
        </div>
        
        <div className="space-y-3">
          {processes.map((process, index) => (
            <div key={process.id} className="p-3 bg-white rounded-lg border border-purple-50 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  className="font-medium text-gray-800 bg-transparent border-0 border-b border-dashed border-gray-200 focus:outline-none"
                  value={process.title}
                  placeholder="Process title"
                  onChange={(e) => {
                    const newProcesses = [...processes];
                    newProcesses[index].title = e.target.value;
                    setProcesses(newProcesses);
                    setIsDataModified(true);
                  }}
                />
                <button 
                  className="p-1 h-auto text-gray-400 hover:text-red-600"
                  onClick={() => {
                    setProcesses(processes.filter((_, i) => i !== index));
                    setIsDataModified(true);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <textarea
                className="mt-2 w-full rounded-lg border border-gray-200 p-3 min-h-[80px]"
                value={process.description}
                placeholder="Process details or notes..."
                onChange={(e) => {
                  const newProcesses = [...processes];
                  newProcesses[index].description = e.target.value;
                  setProcesses(newProcesses);
                  setIsDataModified(true);
                }}
              />
            </div>
          ))}
          
          <button 
            className="w-full mt-2 border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 p-2 rounded-lg flex items-center justify-center"
            onClick={addProcess}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Process/Procedure
          </button>
        </div>
      </div>
      
      {/* Ideas & Brainstorming Section */}
      <div className="bg-gradient-to-r from-amber-50 to-white rounded-xl p-6 border border-amber-100 shadow-sm">
        <div className="flex items-center mb-4">
          <Lightbulb className="h-5 w-5 text-amber-600 mr-2" />
          <h3 className="text-lg font-medium text-amber-700">Ideas & Brainstorming</h3>
        </div>
        
        <textarea
          className="w-full rounded-xl border border-amber-200 p-4 min-h-[120px]"
          value={ideasText}
          placeholder="Capture ideas, brainstorming notes, and future considerations here..."
          onChange={(e) => {
            setIdeasText(e.target.value);
            setIsDataModified(true);
          }}
        />
      </div>
    </div>
  );
};

export default GeneralTab;