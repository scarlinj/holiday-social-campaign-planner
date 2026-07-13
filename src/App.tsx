import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Sparkles, 
  Plus, 
  Search, 
  Building, 
  Users, 
  Volume2, 
  Briefcase, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  Download, 
  RefreshCw, 
  Play, 
  LayoutGrid, 
  ListTodo, 
  Bookmark, 
  ArrowRight, 
  Clock, 
  Heart, 
  Share2, 
  MessageSquare,
  FileText,
  BookmarkCheck,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PRESET_HOLIDAYS } from "./data/holidays";
import { Campaign, PostDraft, PresetHoliday, ChecklistItem } from "./types";

interface SavedBrandProfile {
  id: string;
  name: string;
  brandName: string;
  audience: string;
  tone: string;
  productType: string;
  customContext: string;
}

// Helper to convert timeframe strings like "-7 Days" or "Day Of" into day offsets
function parseTimeframeToOffset(timeframe: string): number {
  const clean = timeframe.toLowerCase().trim();
  if (clean.includes("day of") || clean.includes("dayof") || clean === "0") {
    return 0;
  }
  
  const match = clean.match(/([-+]?\d+)/);
  if (match) {
    let num = parseInt(match[1], 10);
    if (clean.includes("-")) {
      num = -Math.abs(num);
    } else if (clean.includes("+")) {
      num = Math.abs(num);
    } else if (clean.includes("before") || clean.includes("prior")) {
      num = -Math.abs(num);
    } else if (clean.includes("after") || clean.includes("post")) {
      num = Math.abs(num);
    }
    return num;
  }
  
  if (clean.includes("week before") || clean.includes("1 week prior")) return -7;
  if (clean.includes("week after") || clean.includes("1 week post")) return 7;
  if (clean.includes("day before")) return -1;
  if (clean.includes("day after")) return 1;

  return 0;
}

// Initialize checkpoint dates based on the campaign launch date
function initTimelineDates(timeline: any[], launchDateStr: string) {
  const launchDate = new Date(launchDateStr);
  if (isNaN(launchDate.getTime())) return timeline;
  return timeline.map(checkpoint => {
    if (checkpoint.date) return checkpoint;
    const offset = parseTimeframeToOffset(checkpoint.timeframe);
    const checkpointDate = new Date(launchDate);
    checkpointDate.setDate(launchDate.getDate() + offset);
    return {
      ...checkpoint,
      date: checkpointDate.toISOString().split('T')[0]
    };
  });
}

// Parse holiday dates into ISO format (YYYY-MM-DD)
function parseHolidayDateToISO(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const clean = dateStr.toLowerCase().trim();
  if (clean.includes("late november")) {
    return "2026-11-20";
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  // Default fallback to today
  return new Date().toISOString().split('T')[0];
}

export default function App() {
  // --- Form & Discovery State ---
  const [selectedHoliday, setSelectedHoliday] = useState<string>("International Coffee Day");
  const [customHoliday, setCustomHoliday] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // --- Brand Context State ---
  const [brandName, setBrandName] = useState<string>("Brew & Bolt");
  const [audience, setAudience] = useState<string>("Coffee enthusiasts, remote workers, students");
  const [tone, setTone] = useState<string>("Warm, playful, and high-energy");
  const [productType, setProductType] = useState<string>("Specialty coffee, pastries, and workspace vibes");
  const [customContext, setCustomContext] = useState<string>("Highlight our signature double-shot iced espresso and cozy community community hubs.");

  // --- Brand Profiles (Local Storage Persistence) ---
  const [savedProfiles, setSavedProfiles] = useState<SavedBrandProfile[]>([]);
  const [profileNameInput, setProfileNameInput] = useState<string>("");
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // --- App Engine States ---
  const [loadingCampaign, setLoadingCampaign] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  // --- Tab & Active Layout States ---
  const [activeOutputTab, setActiveOutputTab] = useState<'feed' | 'timeline' | 'checklist' | 'calendar'>('feed');
  const [activePlatformTab, setActivePlatformTab] = useState<'Instagram' | 'LinkedIn' | 'X (Twitter)'>('Instagram');
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});
  const [copiedState, setCopiedState] = useState<Record<string, boolean>>({});

  // --- Calendar & Campaign Date States ---
  const [campaignLaunchDate, setCampaignLaunchDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10); // Default to 10 days from today
    return d.toISOString().split('T')[0];
  });
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [draggedOverDay, setDraggedOverDay] = useState<string | null>(null);

  // Synchronize calendar view month with the campaign launch date
  useEffect(() => {
    if (campaignLaunchDate) {
      const d = new Date(campaignLaunchDate);
      if (!isNaN(d.getTime())) {
        setCalendarYear(d.getFullYear());
        setCalendarMonth(d.getMonth());
      }
    }
  }, [campaignLaunchDate]);

  const handleLaunchDateChangeLocal = (newLaunchDateStr: string) => {
    setCampaignLaunchDate(newLaunchDateStr);
    if (!campaign) return;

    const launchDate = new Date(newLaunchDateStr);
    if (isNaN(launchDate.getTime())) return;
    
    const updatedTimeline = campaign.timeline.map(checkpoint => {
      const offset = parseTimeframeToOffset(checkpoint.timeframe);
      const checkpointDate = new Date(launchDate);
      checkpointDate.setDate(launchDate.getDate() + offset);
      return {
        ...checkpoint,
        date: checkpointDate.toISOString().split('T')[0]
      };
    });

    setCampaign({
      ...campaign,
      timeline: updatedTimeline
    });
  };

  // Loading quotes for campaign generator
  const loadingQuotes = [
    "Mapping target audience triggers...",
    "Brainstorming high-converting visual prompts...",
    "Drafting platform-tailored copywriting copy...",
    "Assembling campaign milestone roadmaps...",
    "Structuring critical launch checklists...",
    "Aligning tone guidelines and brand voice..."
  ];

  // Load Saved Profiles
  useEffect(() => {
    const stored = localStorage.getItem("holiday_brand_profiles");
    if (stored) {
      try {
        setSavedProfiles(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved profiles", e);
      }
    }
  }, []);

  // Cycle Loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loadingCampaign) {
      setLoadingMessage(loadingQuotes[0]);
      let index = 1;
      interval = setInterval(() => {
        setLoadingMessage(loadingQuotes[index % loadingQuotes.length]);
        index++;
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loadingCampaign]);

  // Save Current Brand Profile
  const handleSaveProfile = () => {
    if (!profileNameInput.trim()) return;
    const newProfile: SavedBrandProfile = {
      id: Date.now().toString(),
      name: profileNameInput,
      brandName,
      audience,
      tone,
      productType,
      customContext
    };
    const updated = [...savedProfiles, newProfile];
    setSavedProfiles(updated);
    localStorage.setItem("holiday_brand_profiles", JSON.stringify(updated));
    setProfileNameInput("");
    setShowProfileModal(false);
  };

  // Load Selected Profile
  const handleLoadProfile = (profile: SavedBrandProfile) => {
    setBrandName(profile.brandName);
    setAudience(profile.audience);
    setTone(profile.tone);
    setProductType(profile.productType);
    setCustomContext(profile.customContext);
  };

  // Delete Saved Profile
  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedProfiles.filter(p => p.id !== id);
    setSavedProfiles(updated);
    localStorage.setItem("holiday_brand_profiles", JSON.stringify(updated));
  };

  // Get current active event name
  const getActiveEventName = () => {
    return customHoliday.trim() || selectedHoliday;
  };

  // Trigger Campaign Generation
  const handleGenerateCampaign = async () => {
    const eventName = getActiveEventName();
    if (!eventName) {
      setError("Please select a holiday or write a custom event name.");
      return;
    }

    setLoadingCampaign(true);
    setError(null);

    try {
      const response = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holiday: eventName,
          brandName,
          audience,
          tone,
          productType,
          customContext
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate campaign assets.");
      }

      const processedCampaign = {
        ...data,
        timeline: initTimelineDates(data.timeline || [], campaignLaunchDate)
      };
      setCampaign(processedCampaign);
      setActiveOutputTab('feed');
      if (data.posts && data.posts.length > 0) {
        setActivePlatformTab(data.posts[0].platform);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while communicating with Gemini.");
    } finally {
      setLoadingCampaign(false);
    }
  };

  // Generate Image for a social post
  const handleGenerateImage = async (platform: string, customPrompt?: string) => {
    const activePost = campaign?.posts.find(p => p.platform === platform);
    if (!activePost) return;

    const finalPrompt = customPrompt || activePost.visualPrompt;
    setGeneratingImages(prev => ({ ...prev, [platform]: true }));

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspectRatio: "1:1"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not generate creative.");
      }

      setCampaign(prev => {
        if (!prev) return null;
        return {
          ...prev,
          posts: prev.posts.map(p => {
            if (p.platform === platform) {
              return {
                ...p,
                imageUrl: data.imageUrl,
                imageWarning: data.warning
              };
            }
            return p;
          })
        };
      });
    } catch (err: any) {
      console.error(err);
      // Graceful local notification
      alert("Image generation failed. Reverting to backup creative placeholder.");
    } finally {
      setGeneratingImages(prev => ({ ...prev, [platform]: false }));
    }
  };

  // Update post content text locally
  const handleUpdatePostContent = (platform: string, text: string) => {
    if (!campaign) return;
    setCampaign({
      ...campaign,
      posts: campaign.posts.map(p => p.platform === platform ? { ...p, content: text } : p)
    });
  };

  // Update prompt locally
  const handleUpdatePostPrompt = (platform: string, text: string) => {
    if (!campaign) return;
    setCampaign({
      ...campaign,
      posts: campaign.posts.map(p => p.platform === platform ? { ...p, visualPrompt: text } : p)
    });
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedState(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Toggle Checklist item
  const toggleChecklistItem = (id: string) => {
    if (!campaign) return;
    setCampaign({
      ...campaign,
      checklist: campaign.checklist.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    });
  };

  // Download complete text blueprint
  const downloadBlueprint = () => {
    if (!campaign) return;
    
    let text = `=========================================\n`;
    text += `HOLIDAY CAMPAIGN BLUEPRINT: ${getActiveEventName().toUpperCase()}\n`;
    text += `Theme/Tagline: ${campaign.theme}\n`;
    text += `Generated for: ${brandName || "My Brand"}\n`;
    text += `=========================================\n\n`;

    text += `--- SOCIAL MEDIA POSTS ---\n\n`;
    campaign.posts.forEach(post => {
      text += `[${post.platform.toUpperCase()}]\n`;
      text += `--- Copy ---\n${post.content}\n\n`;
      text += `--- AI Visual Prompt ---\n${post.visualPrompt}\n`;
      text += `-----------------------------------------\n\n`;
    });

    text += `--- MARKETING TIMELINE ---\n\n`;
    campaign.timeline.forEach(step => {
      text += `${step.timeframe} - ${step.title}\n`;
      text += `Task: ${step.task}\n`;
      text += `Objective: ${step.objective}\n`;
      text += `-----------------------------------------\n\n`;
    });

    text += `--- LAUNCH CHECKLIST ---\n\n`;
    campaign.checklist.forEach(item => {
      text += `[${item.completed ? "✓" : " "}] (${item.phase}) ${item.title}\n`;
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getActiveEventName().toLowerCase().replace(/\s+/g, "_")}_campaign_blueprint.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter Preset Holidays list
  const filteredHolidays = PRESET_HOLIDAYS.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.date.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || h.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center">
            <Calendar className="w-6 h-6" id="logo_icon" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Holiday Social Campaign Planner
            </h1>
            <p className="text-xs text-slate-500 font-medium">Standalone Workspace & AI Content Suite</p>
          </div>
        </div>

        {/* Quick Brand Profiles Selector */}
        <div className="flex items-center gap-2">
          {savedProfiles.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 py-1 px-2.5 rounded-lg border border-slate-200/60 text-xs">
              <span className="text-slate-500 font-medium">Brand Preset:</span>
              <select 
                className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
                onChange={(e) => {
                  const prof = savedProfiles.find(p => p.id === e.target.value);
                  if (prof) handleLoadProfile(prof);
                }}
                defaultValue=""
              >
                <option value="" disabled>Select brand profile...</option>
                {savedProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.brandName})</option>
                ))}
              </select>
            </div>
          )}
          
          <button 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
            id="btn_save_brand_profile"
          >
            <Bookmark className="w-3.5 h-3.5" />
            Save Brand Details
          </button>
        </div>
      </header>

      {/* Main Workspace Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Creator inputs (5 grid span) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Section 1: Campaign Target Definition */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">1</span>
                Holiday & Event Setup
              </h2>
            </div>

            {/* Custom Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Selected Holiday or Custom Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={customHoliday || selectedHoliday}
                  onChange={(e) => {
                    setCustomHoliday(e.target.value);
                    setSelectedHoliday(""); // Override preset selection
                  }}
                  placeholder="e.g. Earth Day, Winter Clearance, Coffee Fest"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none transition"
                  id="input_event_name"
                />
                <Sparkles className="w-4 h-4 text-indigo-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Catalog Search & Selector */}
            <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">Quick Holiday Catalog</span>
                
                {/* Categories */}
                <div className="flex gap-1">
                  {["All", "Major", "Fun", "Seasonal"].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase transition ${
                        selectedCategory === cat 
                          ? "bg-slate-800 text-white" 
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search holidays..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200/80 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Scrollable grid */}
              <div className="max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1 text-xs">
                {filteredHolidays.map(h => (
                  <button
                    key={h.name}
                    onClick={() => {
                      setSelectedHoliday(h.name);
                      setCustomHoliday(""); // Clear custom input
                      const parsedDate = parseHolidayDateToISO(h.date);
                      handleLaunchDateChangeLocal(parsedDate);
                    }}
                    className={`flex items-start text-left p-2 rounded-lg border transition ${
                      (customHoliday === "" && selectedHoliday === h.name)
                        ? "bg-indigo-50/60 border-indigo-200 text-indigo-900 font-medium"
                        : "bg-white hover:bg-slate-50 border-slate-200/60 text-slate-700"
                    }`}
                  >
                    <span className="text-base mr-1.5">{h.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold text-slate-800">{h.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate">{h.date}</div>
                    </div>
                  </button>
                ))}
                {filteredHolidays.length === 0 && (
                  <div className="col-span-2 text-center text-slate-400 py-4 font-medium">No holidays match your filter.</div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Brand Context Config */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col gap-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">2</span>
              Brand Core Blueprint
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Building className="w-3 h-3" /> Brand Name
                </label>
                <input 
                  type="text" 
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Brew & Bolt"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id="input_brand_name"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Category/Product
                </label>
                <input 
                  type="text" 
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  placeholder="e.g. Coffee shop"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id="input_product_type"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Target Audience
                </label>
                <input 
                  type="text" 
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. Remote workers"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id="input_audience"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> Tone of Voice
                </label>
                <input 
                  type="text" 
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="e.g. Playful & Energetic"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id="input_tone"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Custom Campaign Objectives / Offers</label>
              <textarea 
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="Include details about special discounts, features, specific taglines or content hooks you'd like the AI to weave in."
                rows={3}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                id="input_custom_context"
              />
            </div>

            {/* Clear & Generate Actions */}
            <div className="mt-2 flex flex-col gap-2">
              <button
                onClick={handleGenerateCampaign}
                disabled={loadingCampaign}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md shadow-indigo-200/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                id="btn_generate_campaign"
              >
                {loadingCampaign ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Planning Campaign...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Assemble Campaign Assets</span>
                  </>
                )}
              </button>

              {loadingCampaign && (
                <div className="text-center">
                  <span className="text-[11px] text-indigo-600 font-semibold animate-pulse">{loadingMessage}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Dynamic Outputs (7 grid span) */}
        <section className="lg:col-span-7 flex flex-col">
          
          <AnimatePresence mode="wait">
            {!campaign ? (
              
              /* Landing Onboarding Frame */
              <motion.div 
                key="onboarding"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center flex-1 flex flex-col items-center justify-center min-h-[400px] shadow-sm"
              >
                <div className="relative mb-6">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-35 animate-pulse"></div>
                  <div className="relative bg-white border border-slate-200 p-5 rounded-full text-indigo-600 shadow-md">
                    <Sparkles className="w-10 h-10 animate-bounce" />
                  </div>
                </div>
                
                <h3 className="text-xl font-extrabold text-slate-900 mb-2 tracking-tight">
                  Your Holiday Campaign Launchpad
                </h3>
                <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
                  Select a holiday, key in your brand specifics on the left, and click <strong className="text-slate-800">Assemble Campaign Assets</strong> to co-create a tailored multi-platform campaign blueprint, AI graphics prompts, countdown schedule, and launch checklists.
                </p>

                {/* Quick tutorial overview */}
                <div className="w-full max-w-md grid grid-cols-3 gap-3 text-left">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <div className="text-lg mb-1">📅</div>
                    <div className="text-xs font-bold text-slate-800 mb-0.5">1. Select Holiday</div>
                    <div className="text-[10px] text-slate-400">Choose from major or fun micro-holidays.</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <div className="text-lg mb-1">🎯</div>
                    <div className="text-xs font-bold text-slate-800 mb-0.5">2. Set Strategy</div>
                    <div className="text-[10px] text-slate-400">Match campaign to your exact brand tone.</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <div className="text-lg mb-1">🚀</div>
                    <div className="text-xs font-bold text-slate-800 mb-0.5">3. Co-Create</div>
                    <div className="text-[10px] text-slate-400">Generate copy, graphics, and timeline schedules.</div>
                  </div>
                </div>
              </motion.div>

            ) : (

              /* Full Campaign Workbench Workspace */
              <motion.div 
                key="workbench"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-5 flex-1"
              >
                {/* Header Blueprint Title Card */}
                <div className="bg-slate-900 rounded-2xl p-5 text-white relative overflow-hidden shadow-md">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl"></div>
                  <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
                  
                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <div>
                      <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase inline-block mb-2">
                        {getActiveEventName()} Campaign Blueprint
                      </span>
                      <h2 className="text-xl font-black leading-tight text-white tracking-tight">
                        "{campaign.theme}"
                      </h2>
                      <p className="text-xs text-slate-300 mt-1.5 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                        Active workspace for <strong className="text-white font-semibold">{brandName}</strong>
                      </p>
                    </div>

                    <button
                      onClick={downloadBlueprint}
                      className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl p-2.5 text-white/90 hover:text-white transition flex items-center justify-center gap-1.5 text-xs font-bold"
                      title="Download Campaign Kit"
                      id="btn_download_blueprint"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Export Blueprint</span>
                    </button>
                  </div>
                </div>

                {/* Workspace Output Tabs Selector */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-1 shadow-sm flex">
                  <button
                    onClick={() => setActiveOutputTab('feed')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold tracking-tight transition ${
                      activeOutputTab === 'feed' 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Social Feeds Mockups
                  </button>
                  <button
                    onClick={() => setActiveOutputTab('timeline')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold tracking-tight transition ${
                      activeOutputTab === 'timeline' 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Campaign Countdown
                  </button>
                  <button
                    onClick={() => setActiveOutputTab('checklist')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold tracking-tight transition ${
                      activeOutputTab === 'checklist' 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    Task Tracker
                  </button>
                  <button
                    onClick={() => setActiveOutputTab('calendar')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold tracking-tight transition ${
                      activeOutputTab === 'calendar' 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Interactive Calendar
                  </button>
                </div>

                {/* Sub Tab Panel View Router */}
                <div className="flex-1 flex flex-col min-h-[400px]">
                  
                  {/* TAB 1: SOCIAL FEEDS MOCKUPS WITH WORKBENCH */}
                  {activeOutputTab === 'feed' && (
                    <div className="flex flex-col gap-4 flex-1">
                      
                      {/* Platform sub selector */}
                      <div className="flex gap-2">
                        {campaign.posts.map(post => (
                          <button
                            key={post.platform}
                            onClick={() => setActivePlatformTab(post.platform)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                              activePlatformTab === post.platform 
                                ? "bg-white border-indigo-500 text-indigo-600 shadow-sm font-extrabold" 
                                : "bg-slate-100/85 hover:bg-slate-100 border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {post.platform}
                          </button>
                        ))}
                      </div>

                      {/* Display Selected Platform Panel */}
                      {campaign.posts.filter(p => p.platform === activePlatformTab).map(post => (
                        <div key={post.platform} className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 items-stretch">
                          
                          {/* Live Social Feed Simulator Card (Col Span 7) */}
                          <div className="md:col-span-7 flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Live Mockup Simulator</span>
                            
                            {/* INSTAGRAM SIMULATOR CARD */}
                            {post.platform === 'Instagram' && (
                              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col">
                                {/* Header */}
                                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 p-[1.5px]">
                                      <div className="w-full h-full rounded-full bg-white p-[1px] flex items-center justify-center font-bold text-[10px] text-slate-800">
                                        {brandName.substring(0, 2).toUpperCase()}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-slate-900">{brandName.toLowerCase().replace(/\s+/g, '')}</div>
                                      <div className="text-[9px] text-slate-400">Sponsored • Creative Draft</div>
                                    </div>
                                  </div>
                                  <span className="text-slate-400 font-extrabold text-sm select-none">•••</span>
                                </div>
                                
                                {/* Image Container */}
                                <div className="bg-slate-50 aspect-square w-full relative flex items-center justify-center overflow-hidden border-b border-slate-100 min-h-[250px]">
                                  {generatingImages[post.platform] ? (
                                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 text-center">
                                      <RefreshCw className="w-8 h-8 animate-spin text-white mb-2" />
                                      <span className="text-xs font-bold text-white tracking-wide">Drafting visual asset...</span>
                                    </div>
                                  ) : null}

                                  {post.imageUrl ? (
                                    <img 
                                      src={post.imageUrl} 
                                      alt={post.visualDescription}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
                                      <div className="bg-slate-100 p-4 rounded-full text-slate-400">
                                        <ImageIcon className="w-8 h-8" />
                                      </div>
                                      <span className="text-xs font-bold text-slate-600">Visual Graphic Draft Empty</span>
                                      <p className="text-[10px] text-slate-400 max-w-[180px]">Click generate visual tool on the right to auto-create with AI.</p>
                                    </div>
                                  )}
                                </div>

                                {/* Post Engagement Metrics Panel */}
                                <div className="p-3.5 flex flex-col gap-2 flex-1 justify-between">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3.5 text-slate-700">
                                      <Heart className="w-5 h-5 hover:text-red-500 cursor-pointer transition" />
                                      <MessageSquare className="w-5 h-5 hover:text-slate-900 cursor-pointer transition" />
                                      <Share2 className="w-5 h-5 hover:text-slate-900 cursor-pointer transition" />
                                    </div>
                                    <Bookmark className="w-5 h-5 text-slate-700 hover:text-slate-900 cursor-pointer transition" />
                                  </div>

                                  <div className="text-[11px] font-bold text-slate-900 select-none">1,482 likes</div>

                                  <div className="text-xs leading-relaxed text-slate-800 flex-1 overflow-y-auto max-h-[140px] pr-1">
                                    <span className="font-extrabold mr-1.5">{brandName.toLowerCase().replace(/\s+/g, '')}</span>
                                    {post.content}
                                  </div>

                                  <div className="text-[9px] text-slate-400 uppercase tracking-wider mt-1.5">2 Hours ago</div>
                                </div>
                              </div>
                            )}

                            {/* LINKEDIN SIMULATOR CARD */}
                            {post.platform === 'LinkedIn' && (
                              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 bg-slate-800 text-white rounded-lg flex items-center justify-center font-black text-xs">
                                      {brandName.substring(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                        {brandName}
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                        <span className="text-[9px] text-indigo-600 font-bold hover:underline cursor-pointer">Follow</span>
                                      </div>
                                      <div className="text-[9px] text-slate-400">{productType} • 1st • Just now</div>
                                    </div>
                                  </div>
                                  <span className="text-slate-400 font-extrabold text-sm cursor-pointer hover:bg-slate-50 px-2 rounded">•••</span>
                                </div>

                                <div className="text-xs leading-relaxed text-slate-800 mb-3 flex-1 overflow-y-auto max-h-[160px] pr-1 whitespace-pre-wrap">
                                  {post.content}
                                </div>

                                {/* Graphic Frame */}
                                <div className="bg-slate-100 rounded-xl relative overflow-hidden aspect-[1.91/1] w-full flex items-center justify-center border border-slate-200/50 min-h-[180px]">
                                  {generatingImages[post.platform] && (
                                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4">
                                      <RefreshCw className="w-8 h-8 animate-spin text-white mb-2" />
                                      <span className="text-xs font-bold text-white tracking-wide">Assembling draft asset...</span>
                                    </div>
                                  )}

                                  {post.imageUrl ? (
                                    <img 
                                      src={post.imageUrl} 
                                      alt={post.visualDescription}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="text-center p-4 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                                      <ImageIcon className="w-6 h-6" />
                                      <div className="text-[10px] font-bold">Campaign Graphic Template</div>
                                      <div className="text-[8px] max-w-[180px]">Draft will align 1.91:1 standard width ratio.</div>
                                    </div>
                                  )}
                                </div>

                                {/* Reactions */}
                                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-500">
                                  <span className="flex items-center -space-x-1">
                                    <span className="bg-blue-500 text-white rounded-full p-0.5 text-[8px]">👍</span>
                                    <span className="bg-red-500 text-white rounded-full p-0.5 text-[8px]">❤️</span>
                                    <span className="bg-yellow-500 text-white rounded-full p-0.5 text-[8px]">💡</span>
                                  </span>
                                  <span>48 likes • 3 comments</span>
                                </div>
                              </div>
                            )}

                            {/* X (TWITTER) SIMULATOR CARD */}
                            {post.platform === 'X (Twitter)' && (
                              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col p-4 justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-9 h-9 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xs select-none">
                                      {brandName.substring(0, 1).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                        {brandName}
                                        <span className="text-[10px] text-blue-500" title="Verified Brand">☑️</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400">@{brandName.toLowerCase().replace(/\s+/g, '')}</div>
                                    </div>
                                  </div>

                                  <div className="text-xs leading-relaxed text-slate-900 mb-3 whitespace-pre-wrap overflow-y-auto max-h-[160px] pr-1">
                                    {post.content}
                                  </div>
                                </div>

                                {/* Graphic Frame */}
                                <div className="bg-slate-100 rounded-2xl relative overflow-hidden aspect-[1.91/1] w-full flex items-center justify-center border border-slate-200/50 min-h-[180px]">
                                  {generatingImages[post.platform] && (
                                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4">
                                      <RefreshCw className="w-8 h-8 animate-spin text-white mb-2" />
                                      <span className="text-xs font-bold text-white tracking-wide">Rendering vector draft...</span>
                                    </div>
                                  )}

                                  {post.imageUrl ? (
                                    <img 
                                      src={post.imageUrl} 
                                      alt={post.visualDescription}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="text-center p-4 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                                      <ImageIcon className="w-6 h-6" />
                                      <div className="text-[10px] font-bold">Twitter Card Graphic Preview</div>
                                      <div className="text-[8px] max-w-[180px]">Card layout renders at landscape resolution.</div>
                                    </div>
                                  )}
                                </div>

                                {/* Metrics bar */}
                                <div className="flex items-center justify-between text-slate-500 text-[10px] mt-4 pt-3 border-t border-slate-100">
                                  <span>💬 8</span>
                                  <span>🔁 12</span>
                                  <span>❤️ 35</span>
                                  <span>📊 2.4K views</span>
                                  <span>🔗</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Control Station (Col Span 5) */}
                          <div className="md:col-span-5 flex flex-col gap-4">
                            
                            {/* Copy Draft Text Tool */}
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-indigo-600" /> Post Copywriter
                                </span>
                                <button
                                  onClick={() => copyToClipboard(post.content, post.platform)}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                                    copiedState[post.platform] 
                                      ? "bg-emerald-500 text-white" 
                                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                  }`}
                                  id={`btn_copy_${post.platform}`}
                                >
                                  {copiedState[post.platform] ? (
                                    <>
                                      <Check className="w-3 h-3" /> Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" /> Copy Copy
                                    </>
                                  )}
                                </button>
                              </div>

                              <textarea
                                value={post.content}
                                onChange={(e) => handleUpdatePostContent(post.platform, e.target.value)}
                                rows={6}
                                className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                              />

                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                <span>Word Count: {post.content.split(/\s+/).filter(Boolean).length}</span>
                                <span>Active hashtags auto-detected</span>
                              </div>
                            </div>

                            {/* Visual Asset Generator Workshop */}
                            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm flex flex-col gap-2.5">
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Graphics Generation Lab
                              </span>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-slate-400">AI Prompt Workspace</label>
                                <textarea
                                  value={post.visualPrompt}
                                  onChange={(e) => handleUpdatePostPrompt(post.platform, e.target.value)}
                                  rows={4}
                                  className="w-full text-[11px] font-mono border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-normal"
                                />
                              </div>

                              <button
                                onClick={() => handleGenerateImage(post.platform)}
                                disabled={generatingImages[post.platform]}
                                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
                                id={`btn_generate_image_${post.platform}`}
                              >
                                {generatingImages[post.platform] ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Rendering AI Draft...</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Draft Graphic with Gemini</span>
                                  </>
                                )}
                              </button>

                              {/* Warning Display */}
                              {post.imageWarning && (
                                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2 flex items-start gap-1.5 text-[9px] text-yellow-800 font-medium">
                                  <AlertCircle className="w-3.5 h-3.5 text-yellow-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold">Notice:</span> {post.imageWarning}
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 2: CAMPAIGN COUNTDOWN PLANNER */}
                  {activeOutputTab === 'timeline' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col gap-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Campaign Countdown Timeline</h3>
                          <p className="text-xs text-slate-400 font-medium">Recommended release timeline for holiday momentum.</p>
                        </div>
                      </div>

                      <div className="relative border-l-2 border-indigo-100 pl-6 ml-3 flex flex-col gap-6 py-2">
                        {campaign.timeline.map((step, idx) => (
                          <div key={idx} className="relative">
                            
                            {/* Circle pointer */}
                            <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-white">
                              <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded text-[10px]">
                                    {step.timeframe}
                                  </span>
                                  <h4 className="text-xs font-extrabold text-slate-800">{step.title}</h4>
                                </div>
                                <p className="text-xs text-slate-600 font-medium mt-1.5">
                                  <strong className="text-slate-900 font-semibold">Action:</strong> {step.task}
                                </p>
                              </div>

                              <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200/60 pt-3 sm:pt-0 sm:pl-4 max-w-xs shrink-0">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider mb-0.5">Objective</span>
                                <span className="text-[10px] font-bold text-slate-600 leading-normal">{step.objective}</span>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: OPERATIONAL TASK TRACKER */}
                  {activeOutputTab === 'checklist' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col gap-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Campaign Operational Checklist</h3>
                          <p className="text-xs text-slate-400 font-medium">Keep your campaign organized by checking off progress.</p>
                        </div>

                        {/* Completion score */}
                        <div className="bg-slate-100 text-slate-700 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-slate-200/40">
                          {campaign.checklist.filter(c => c.completed).length} / {campaign.checklist.length} Completed
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Phases grouping */}
                        {Array.from(new Set(campaign.checklist.map(c => c.phase))).map(phase => (
                          <div key={phase} className="bg-slate-50/50 border border-slate-200/40 rounded-xl p-4 flex flex-col gap-2">
                            <span className="text-[10px] uppercase font-black text-indigo-600 tracking-wider border-b border-indigo-100/60 pb-1.5 mb-1 inline-block">
                              {phase} Phase
                            </span>

                            <div className="flex flex-col gap-2">
                              {campaign.checklist.filter(c => c.phase === phase).map(item => (
                                <label 
                                  key={item.id}
                                  className={`flex items-start gap-2.5 p-2 bg-white border rounded-lg transition cursor-pointer select-none ${
                                    item.completed 
                                      ? "border-emerald-200 bg-emerald-50/20 text-slate-500 line-through decoration-slate-300" 
                                      : "border-slate-200/60 hover:border-slate-300 text-slate-800"
                                  }`}
                                >
                                  <input 
                                    type="checkbox"
                                    checked={item.completed}
                                    onChange={() => toggleChecklistItem(item.id)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer accent-indigo-600"
                                  />
                                  <span className="text-[11px] font-semibold leading-relaxed">{item.title}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: INTERACTIVE CALENDAR VIEW */}
                  {activeOutputTab === 'calendar' && (() => {
                    // Month names array
                    const MONTH_NAMES = [
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ];

                    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
                    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

                    // Generate full grid of days
                    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
                    const fDay = firstDayOfMonth(calendarYear, calendarMonth);
                    const dInMonth = daysInMonth(calendarYear, calendarMonth);

                    // Previous month padding
                    const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
                    const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
                    const dInPrevMonth = daysInMonth(prevYear, prevMonth);
                    
                    for (let i = fDay - 1; i >= 0; i--) {
                      const dNum = dInPrevMonth - i;
                      const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
                      cells.push({ dateStr: dStr, dayNum: dNum, isCurrentMonth: false });
                    }

                    // Current month days
                    for (let i = 1; i <= dInMonth; i++) {
                      const dStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                      cells.push({ dateStr: dStr, dayNum: i, isCurrentMonth: true });
                    }

                    // Next month padding
                    const totalCellsNeeded = cells.length > 35 ? 42 : 35;
                    const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
                    const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
                    let nextMonthDay = 1;
                    while (cells.length < totalCellsNeeded) {
                      const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextMonthDay).padStart(2, '0')}`;
                      cells.push({ dateStr: dStr, dayNum: nextMonthDay, isCurrentMonth: false });
                      nextMonthDay++;
                    }

                    // Handler for dropping a task on a day
                    const handleDropOnDay = (e: React.DragEvent, targetDateStr: string) => {
                      e.preventDefault();
                      setDraggedOverDay(null);
                      const indexStr = e.dataTransfer.getData("checkpointIndex");
                      if (!indexStr || !campaign) return;
                      const index = parseInt(indexStr, 10);
                      if (isNaN(index) || index < 0 || index >= campaign.timeline.length) return;

                      // Update the checkpoint date
                      const updatedTimeline = [...campaign.timeline];
                      const checkpoint = { ...updatedTimeline[index] };
                      checkpoint.date = targetDateStr;

                      // Recalculate timeframe offset based on campaignLaunchDate
                      const launchDate = new Date(campaignLaunchDate);
                      const targetDate = new Date(targetDateStr);
                      const diffTime = targetDate.getTime() - launchDate.getTime();
                      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                      if (diffDays === 0) {
                        checkpoint.timeframe = "Day Of";
                      } else if (diffDays < 0) {
                        checkpoint.timeframe = `${diffDays} Days`;
                      } else {
                        checkpoint.timeframe = `+${diffDays} Days`;
                      }

                      updatedTimeline[index] = checkpoint;

                      // Sort timeline chronologically
                      updatedTimeline.sort((a, b) => {
                        const dateA = a.date ? new Date(a.date).getTime() : 0;
                        const dateB = b.date ? new Date(b.date).getTime() : 0;
                        return dateA - dateB;
                      });

                      setCampaign({
                        ...campaign,
                        timeline: updatedTimeline
                      });
                    };

                    const prevMonthNav = () => {
                      if (calendarMonth === 0) {
                        setCalendarMonth(11);
                        setCalendarYear(calendarYear - 1);
                      } else {
                        setCalendarMonth(calendarMonth - 1);
                      }
                    };

                    const nextMonthNav = () => {
                      if (calendarMonth === 11) {
                        setCalendarMonth(0);
                        setCalendarYear(calendarYear + 1);
                      } else {
                        setCalendarMonth(calendarMonth + 1);
                      }
                    };

                    return (
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col gap-5 flex-1">
                        
                        {/* Calendar Controls & Picker Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-indigo-600" /> Interactive Campaign Calendar
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">Drag and drop campaign tasks to reschedule them dynamically.</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            {/* Campaign Peak / Launch Date setting */}
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl text-xs">
                              <span className="text-slate-500 font-semibold">🚀 Campaign Launch:</span>
                              <input 
                                type="date"
                                value={campaignLaunchDate}
                                onChange={(e) => handleLaunchDateChangeLocal(e.target.value)}
                                className="bg-transparent font-bold text-indigo-700 outline-none border-none cursor-pointer focus:ring-0"
                              />
                            </div>

                            {/* Month Nav Buttons */}
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                              <button 
                                onClick={prevMonthNav}
                                className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-indigo-600 transition shadow-xs"
                                title="Previous Month"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-bold text-slate-800 px-2 min-w-[90px] text-center">
                                {MONTH_NAMES[calendarMonth]} {calendarYear}
                              </span>
                              <button 
                                onClick={nextMonthNav}
                                className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-indigo-600 transition shadow-xs"
                                title="Next Month"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Calendar Month Grid */}
                        <div className="flex flex-col gap-1 flex-1">
                          {/* Week headers */}
                          <div className="grid grid-cols-7 gap-2 text-center text-[10px] uppercase font-black text-slate-400 tracking-wider">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                              <div key={day} className="py-1">{day}</div>
                            ))}
                          </div>

                          {/* Days Grid */}
                          <div className="grid grid-cols-7 gap-2 auto-rows-fr flex-1 min-h-[380px]">
                            {cells.map((cell, idx) => {
                              const dayTasks = campaign.timeline.map((t, index) => ({ ...t, index })).filter(t => t.date === cell.dateStr);
                              const isLaunchDay = cell.dateStr === campaignLaunchDate;
                              const isCurrentMonth = cell.isCurrentMonth;
                              const isHovered = draggedOverDay === cell.dateStr;

                              return (
                                <div
                                  key={idx}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    if (draggedOverDay !== cell.dateStr) {
                                      setDraggedOverDay(cell.dateStr);
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (draggedOverDay === cell.dateStr) {
                                      setDraggedOverDay(null);
                                    }
                                  }}
                                  onDrop={(e) => handleDropOnDay(e, cell.dateStr)}
                                  className={`min-h-[75px] p-1.5 border rounded-xl flex flex-col justify-between transition-all ${
                                    isCurrentMonth 
                                      ? "bg-white border-slate-200/80" 
                                      : "bg-slate-50/60 border-slate-100 text-slate-400"
                                  } ${
                                    isLaunchDay 
                                      ? "ring-2 ring-indigo-500/80 ring-offset-1 bg-indigo-50/20" 
                                      : ""
                                  } ${
                                    isHovered 
                                      ? "border-indigo-400 bg-indigo-50/30 shadow-md scale-[1.01]" 
                                      : "hover:border-slate-300"
                                  }`}
                                >
                                  {/* Day Number and Badges */}
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center ${
                                      isLaunchDay 
                                        ? "bg-indigo-600 text-white shadow-xs" 
                                        : isCurrentMonth ? "text-slate-700" : "text-slate-400"
                                    }`}>
                                      {cell.dayNum}
                                    </span>

                                    {isLaunchDay && (
                                      <span className="text-[8px] font-black uppercase text-indigo-700 tracking-wider bg-indigo-100 px-1 py-0.5 rounded leading-none shrink-0">
                                        Launch
                                      </span>
                                    )}
                                  </div>

                                  {/* Task Pills inside cell */}
                                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[70px] pr-0.5 custom-scrollbar">
                                    {dayTasks.map((task) => (
                                      <div
                                        key={task.index}
                                        draggable={true}
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData("checkpointIndex", task.index.toString());
                                          e.dataTransfer.effectAllowed = "move";
                                        }}
                                        className="group cursor-grab active:cursor-grabbing bg-slate-900 text-white rounded-lg p-1.5 text-[9px] font-bold leading-snug flex flex-col gap-0.5 hover:bg-slate-800 transition relative overflow-hidden shadow-xs"
                                        title={`${task.timeframe} - ${task.task}`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-[8px] bg-white/10 text-indigo-200 px-1 py-0.5 rounded uppercase leading-none font-extrabold tracking-wider shrink-0 max-w-[40px] truncate">
                                            {task.timeframe}
                                          </span>
                                        </div>
                                        <div className="truncate font-semibold group-hover:whitespace-normal line-clamp-1 group-hover:line-clamp-none">
                                          {task.title}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Calendar Bottom Legend / Quick Note */}
                        <div className="bg-indigo-50/40 border border-indigo-100/40 rounded-xl p-3 text-[10px] text-slate-500 leading-relaxed flex items-start gap-2">
                          <span className="text-indigo-600 text-xs">💡</span>
                          <div>
                            <span className="font-bold text-indigo-900">Pro-Tip:</span> Change the <span className="font-bold">Campaign Launch</span> date above to shift the entire timeline automatically relative to the new launch date, then fine-tune specific events by dragging-and-dropping them around.
                          </div>
                        </div>

                      </div>
                    );
                  })()}

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </section>

      </main>

      {/* FOOTER METRICS INFO */}
      <footer className="bg-white border-t border-slate-200/60 py-4 px-6 text-center text-xs text-slate-400 font-medium">
        <span>Holiday Social Campaign Planner © 2026. Standalone, durable offline-first workflow.</span>
      </footer>

      {/* SAVE PROFILE MODAL DIALOG */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl max-w-sm w-full flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-indigo-600" /> Save Current Brand Profile
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                This will save the current brand specs (Name, Audience, Tone, Product details) to your local storage so you can easily toggle between multiple brand profiles later.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Preset Name / Label</label>
              <input 
                type="text" 
                value={profileNameInput}
                onChange={(e) => setProfileNameInput(e.target.value)}
                placeholder="e.g. Local Coffee Shop Client"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="input_profile_preset_name"
              />
            </div>

            {/* List of current presets */}
            {savedProfiles.length > 0 && (
              <div className="flex flex-col gap-1 bg-slate-50 rounded-lg p-2 max-h-24 overflow-y-auto">
                <span className="text-[9px] uppercase font-bold text-slate-400">Manage Saved Presets</span>
                {savedProfiles.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-100 last:border-b-0">
                    <span className="font-semibold text-slate-700 truncate">{p.name} ({p.brandName})</span>
                    <button 
                      onClick={(e) => handleDeleteProfile(p.id, e)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition"
                id="btn_cancel_save"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={!profileNameInput.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 transition"
                id="btn_confirm_save"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
