import { useState, useEffect, ReactNode } from 'react';
import { 
  Sprout, 
  Calendar, 
  CloudSun, 
  Settings, 
  Plus, 
  MapPin, 
  ChevronRight, 
  Info, 
  CheckCircle2,
  MessageSquare,
  ArrowLeft,
  Loader2,
  FileDown,
  BookOpen,
  Sparkles,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { getGardeningAdvice, getDailyTasks } from '@/lib/gemini';

// --- Types ---

interface Plant {
  id: string;
  name: string;
  variety: string;
  addedAt: string;
  lastTreated?: string;
}

interface Activity {
  id: string;
  date: string;
  plantId?: string;
  plantName?: string;
  action: string;
  notes?: string;
  status?: 'planned' | 'completed';
}

interface DailyTask {
  title: string;
  description: string;
}

interface DailyTasksResponse {
  tasks: DailyTask[];
  warning?: string;
}

interface AdviceSection {
  title: string;
  content: string;
}

interface Product {
  name: string;
  description: string;
  usage: string;
  safety: string;
}

interface PlantAdviceResponse {
  sections: AdviceSection[];
  secretTip: string;
  products: Product[];
}

interface UserProfile {
  name: string;
  region: string;
  city: string;
}

// --- Constants ---

const UKRAINE_REGIONS = [
  "Автономна Республіка Крим", "Вінницька", "Волинська", "Дніпропетровська", "Донецька", "Житомирська", 
  "Закарпатська", "Запорізька", "Івано-Франківська", "Київська", "Кіровоградська", 
  "Луганська", "Львівська", "Миколаївська", "Одеська", "Полтавська", "Рівненська", 
  "Сумська", "Тернопільська", "Харківська", "Херсонська", "Хмельницька", 
  "Черкаська", "Чернівецька", "Чернігівська"
];

// --- Components ---

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [dailyData, setDailyData] = useState<DailyTasksResponse | null>(null);
  const [dailySource, setDailySource] = useState<'ai' | 'static'>('ai');
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [plantAdvice, setPlantAdvice] = useState<PlantAdviceResponse | null>(null);
  const [adviceSource, setAdviceSource] = useState<'ai' | 'static'>('ai');
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [customApiKey, setCustomApiKey] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem('sadyba_profile');
    const savedPlants = localStorage.getItem('sadyba_plants');
    const savedActivities = localStorage.getItem('sadyba_activities');
    const savedKey = localStorage.getItem('custom_gemini_api_key');
    
    if (savedProfile) setProfile(JSON.parse(savedProfile));
    if (savedPlants) setPlants(JSON.parse(savedPlants));
    if (savedActivities) setActivities(JSON.parse(savedActivities));
    if (savedKey) setCustomApiKey(savedKey);
  }, []);

  // Fetch daily tasks when profile is ready
  useEffect(() => {
    if (profile && activeTab === 'home' && !dailyData) {
      fetchDailyTasks();
    }
  }, [profile, activeTab]);

  // PWA Install Prompt Logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem('sadyba_install_dismissed')) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const dismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('sadyba_install_dismissed', 'true');
  };

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('custom_gemini_api_key', key);
    if (key.trim() !== '') {
      toast.success('Ключ ШІ збережено');
    } else {
      toast.info('Ключ ШІ видалено');
    }
  };

  const fetchDailyTasks = async () => {
    if (!profile) return;
    
    setIsLoadingTasks(true);
    const date = new Date().toLocaleDateString('uk-UA');
    const regionText = profile.region === "Автономна Республіка Крим" ? profile.region : `${profile.region} область`;
    const { data, error, source } = await getDailyTasks(`${profile.city}, ${regionText}`, date);
    if (error && !data) {
      console.error("Daily Tasks Error:", error);
      toast.error(`Не вдалося завантажити завдання: ${error}`);
    }
    setDailyData(data);
    setDailySource(source as 'ai' | 'static');
    setIsLoadingTasks(false);
  };

  const saveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('sadyba_profile', JSON.stringify(newProfile));
    toast.success('Профіль збережено!');
  };

  const addPlant = (name: string, variety: string) => {
    const newPlant: Plant = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      variety,
      addedAt: new Date().toISOString(),
    };
    const updatedPlants = [...plants, newPlant];
    setPlants(updatedPlants);
    localStorage.setItem('sadyba_plants', JSON.stringify(updatedPlants));
    toast.success('Рослину додано до саду!');
  };

  const deletePlant = (id: string) => {
    const updatedPlants = plants.filter(p => p.id !== id);
    setPlants(updatedPlants);
    localStorage.setItem('sadyba_plants', JSON.stringify(updatedPlants));
    
    // Also cleanup activities for this plant
    const updatedActivities = activities.filter(a => a.plantId !== id);
    setActivities(updatedActivities);
    localStorage.setItem('sadyba_activities', JSON.stringify(updatedActivities));
    
    toast.info('Рослину видалено');
  };

  const addActivity = (action: string, status: 'planned' | 'completed' = 'completed', date: string = new Date().toISOString(), plant?: Plant, notes?: string) => {
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      date,
      plantId: plant?.id,
      plantName: plant?.name,
      action,
      notes,
      status,
    };
    const updatedActivities = [newActivity, ...activities];
    setActivities(updatedActivities);
    localStorage.setItem('sadyba_activities', JSON.stringify(updatedActivities));
    
    if (plant && status === 'completed') {
      const updatedPlants = plants.map(p => 
        p.id === plant.id ? { ...p, lastTreated: new Date().toISOString() } : p
      );
      setPlants(updatedPlants);
      localStorage.setItem('sadyba_plants', JSON.stringify(updatedPlants));
    }
    
    toast.success(status === 'completed' ? 'Запис додано до журналу!' : 'Роботу заплановано!');
  };

  const toggleActivityStatus = (activityId: string) => {
    const updatedActivities = activities.map(a => {
      if (a.id === activityId) {
        const newStatus = a.status === 'planned' ? 'completed' : 'planned';
        
        // If moving to completed, update plant's lastTreated
        if (newStatus === 'completed' && a.plantId) {
          const updatedPlants = plants.map(p => 
            p.id === a.plantId ? { ...p, lastTreated: new Date().toISOString() } : p
          );
          setPlants(updatedPlants);
          localStorage.setItem('sadyba_plants', JSON.stringify(updatedPlants));
        }
        
        return { ...a, status: newStatus, date: newStatus === 'completed' ? new Date().toISOString() : a.date };
      }
      return a;
    });
    
    setActivities(updatedActivities);
    localStorage.setItem('sadyba_activities', JSON.stringify(updatedActivities));
    toast.success('Статус оновлено');
  };

  const showPlantAdvice = async (plant: Plant) => {
    setSelectedPlant(plant);
    setPlantAdvice(null);

    setIsLoadingAdvice(true);
    
    const city = profile?.city || "Київ";
    const region = profile?.region || "Київська";
    const regionText = region === "Автономна Республіка Крим" ? region : `${region} область`;
    
    const { data, error, source } = await getGardeningAdvice(plant.name, plant.variety, `${city}, ${regionText}`);
    if (error && !data) {
      console.error("Gardening Advice Error:", error);
      toast.error(`Помилка: ${error}`);
    }
    setPlantAdvice(data);
    setAdviceSource(source as 'ai' | 'static');
    setIsLoadingAdvice(false);
  };

  const exportToPDF = async (plant: Plant) => {
    const element = document.getElementById(`pdf-report-${plant.id}`);
    if (!element) return;

    toast.loading('Створюємо PDF звіт...');
    
    try {
      // Temporarily show the element for capturing
      element.style.display = 'block';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add extra pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`sadyba_${plant.name}_${new Date().toLocaleDateString('uk-UA')}.pdf`);
      
      element.style.display = 'none';
      toast.dismiss();
      toast.success('PDF звіт завантажено!');
    } catch (error) {
      console.error('PDF Error:', error);
      toast.dismiss();
      toast.error('Не вдалося створити PDF');
      element.style.display = 'none';
    }
  };

  const renderTextWithProducts = (text: string, products: Product[]) => {
    if (!products || products.length === 0) return text;

    // Sort products by name length descending to avoid partial matches
    const sortedProducts = [...products].sort((a, b) => b.name.length - a.name.length);
    const names = sortedProducts.map(p => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${names})`, 'gi');
    
    const parts = text.split(regex);
    
    return parts.map((part, i) => {
      const product = products.find(p => p.name.toLowerCase() === part.toLowerCase());
      if (product) {
        return (
          <button 
            key={i} 
            onClick={() => setSelectedProduct(product)}
            className="text-primary font-bold underline decoration-dotted underline-offset-4 hover:text-secondary transition-colors cursor-pointer"
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  // --- Renderers ---

  if (!profile) {
    return <Onboarding onComplete={saveProfile} />;
  }

  return (
    <div className="min-h-screen bg-background pb-32 font-sans overflow-y-auto overflow-x-hidden">
      <header className="bg-primary text-primary-foreground p-6 rounded-b-3xl shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif">Садиба UA</h1>
            <p className="text-sm opacity-90 flex items-center gap-1">
              <MapPin size={14} /> {profile.city}, {profile.region === "Автономна Республіка Крим" ? profile.region : `${profile.region} обл.`}
            </p>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <CloudSun size={28} />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-none shadow-md overflow-hidden bg-white/50 backdrop-blur-sm">
                <CardHeader className="bg-accent/10 border-b border-accent/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                        <Calendar className="text-secondary" /> Поради на сьогодні
                      </CardTitle>
                      <CardDescription className="text-base mt-1">
                        {new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </CardDescription>
                    </div>
                    {!isLoadingTasks && dailyData && (
                      <Badge variant={dailySource === 'ai' ? 'default' : 'secondary'} className="flex items-center gap-1">
                        {dailySource === 'ai' ? <Sparkles size={12} /> : <BookOpen size={12} />}
                        {dailySource === 'ai' ? 'ШІ' : 'Довідник'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {isLoadingTasks ? (
                    <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground">
                      <Loader2 className="animate-spin" size={32} />
                      <p>Завантажуємо поради агронома...</p>
                    </div>
                  ) : dailyData ? (
                    <>
                      {dailyData.warning && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-r-xl flex gap-3 items-start">
                          <Info className="text-amber-600 shrink-0 mt-1" size={20} />
                          <p className="text-amber-900 font-medium">{dailyData.warning}</p>
                        </div>
                      )}
                      <div className="space-y-4">
                        {dailyData.tasks.map((task, idx) => (
                          <div key={idx} className="flex gap-4 items-start group">
                            <div className="bg-primary/10 text-primary font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-lg text-primary break-words">{task.title}</h4>
                              <p className="text-muted-foreground leading-relaxed">{task.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">На сьогодні особливих вказівок немає. Гарного відпочинку!</p>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-secondary/10 border-secondary/20 cursor-pointer hover:bg-secondary/20 transition-colors" onClick={() => setActiveTab('garden')}>
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <Sprout className="text-secondary" size={32} />
                    <span className="font-semibold">Мій Сад</span>
                    <Badge variant="secondary">{plants.length} рослин</Badge>
                  </CardContent>
                </Card>
                <Card className="bg-primary/10 border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => setActiveTab('calendar')}>
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <Calendar className="text-primary" size={32} />
                    <span className="font-semibold">Календар</span>
                    <Badge variant="outline">Березень</Badge>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'garden' && (
            <motion.div 
              key="garden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl sm:text-3xl">Мій Сад</h2>
                <AddPlantDialog onAdd={addPlant} />
              </div>

              {plants.length === 0 ? (
                <div className="text-center py-12 space-y-4 bg-white/50 rounded-3xl border-2 border-dashed border-muted">
                  <Sprout size={64} className="mx-auto text-muted-foreground opacity-50" />
                  <p className="text-lg text-muted-foreground">У вашому саду ще немає рослин</p>
                  <AddPlantDialog onAdd={addPlant} />
                </div>
              ) : (
                <div className="grid gap-4">
                  {plants.map(plant => (
                    <Card key={plant.id} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => showPlantAdvice(plant)}>
                      <CardContent className="p-4 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-2xl group-hover:bg-primary/20 transition-colors">
                            <Sprout className="text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{plant.name}</h3>
                            <p className="text-muted-foreground">{plant.variety}</p>
                          </div>
                        </div>
                        <ChevronRight className="text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl sm:text-3xl">Журнал робіт</h2>
                <AddActivityDialog plants={plants} onAdd={addActivity} />
              </div>

              {activities.length === 0 ? (
                <Card className="bg-white/50 border-dashed border-2">
                  <CardContent className="p-12 text-center space-y-4">
                    <Calendar className="mx-auto text-muted-foreground opacity-30" size={48} />
                    <p className="text-lg text-muted-foreground">Ви ще не записували свої роботи. Почніть сьогодні!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Planned Column */}
                  <div className="space-y-4">
                    <h3 className="text-xl sm:text-2xl flex items-center gap-2 font-serif">
                      <Calendar className="text-secondary" /> Заплановано
                    </h3>
                    <div className="space-y-4">
                      {activities.filter(a => a.status === 'planned').length === 0 ? (
                        <p className="text-muted-foreground italic bg-muted/20 p-4 rounded-2xl">Немає запланованих робіт</p>
                      ) : (
                        activities.filter(a => a.status === 'planned').map(activity => (
                          <Card key={activity.id} className="bg-secondary/5 border-secondary/20 relative group overflow-hidden">
                            <CardContent className="p-4 flex gap-4">
                              <button 
                                onClick={() => toggleActivityStatus(activity.id)}
                                className="shrink-0 w-12 h-12 rounded-2xl border-2 border-secondary flex items-center justify-center hover:bg-secondary/20 transition-all"
                                title="Виконати"
                              >
                                <CheckCircle2 className="text-secondary opacity-0 group-hover:opacity-50" />
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2">
                                  <h4 className="font-bold text-lg truncate w-full sm:w-auto overflow-hidden">{activity.action}</h4>
                                  <span className="text-xs font-medium text-secondary bg-secondary/10 px-2 py-1 rounded-full whitespace-nowrap shrink-0">
                                    {new Date(activity.date).toLocaleDateString('uk-UA')}
                                  </span>
                                </div>
                                {activity.plantName && (
                                  <p className="text-sm text-muted-foreground font-medium">{activity.plantName}</p>
                                )}
                                {activity.notes && <p className="text-sm mt-2 text-muted-foreground italic">{activity.notes}</p>}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="mt-3 w-full gap-2 text-secondary hover:text-secondary hover:bg-secondary/10 rounded-xl"
                                  onClick={() => toggleActivityStatus(activity.id)}
                                >
                                  <CheckCircle2 size={16} /> Позначити як виконане
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Completed Column */}
                  <div className="space-y-4">
                    <h3 className="text-xl sm:text-2xl flex items-center gap-2 font-serif">
                      <CheckCircle2 className="text-green-600" /> Виконано
                    </h3>
                    <div className="space-y-4">
                      {activities.filter(a => a.status === 'completed' || !a.status).length === 0 ? (
                        <p className="text-muted-foreground italic bg-muted/20 p-4 rounded-2xl">Історія порожня</p>
                      ) : (
                        activities.filter(a => a.status === 'completed' || !a.status).map(activity => (
                          <Card key={activity.id} className="bg-white">
                            <CardContent className="p-4 flex gap-4">
                              <div className="flex flex-col items-center justify-center bg-primary/10 text-primary w-16 h-16 rounded-2xl shrink-0">
                                <span className="text-xs uppercase font-bold">
                                  {new Date(activity.date).toLocaleDateString('uk-UA', { month: 'short' })}
                                </span>
                                <span className="text-xl sm:text-2xl font-bold">
                                  {new Date(activity.date).getDate()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2">
                                  <h4 className="font-bold text-lg truncate w-full sm:w-auto overflow-hidden">{activity.action}</h4>
                                  {activity.plantName && (
                                    <Badge variant="outline" className="bg-secondary/5 whitespace-nowrap shrink-0">
                                      {activity.plantName}
                                    </Badge>
                                  )}
                                </div>
                                {activity.notes && <p className="text-sm mt-1 text-muted-foreground">{activity.notes}</p>}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(activity.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl sm:text-3xl">Налаштування</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Ваше ім'я</label>
                    <Input value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="text-base sm:text-lg py-3 sm:py-6" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Область</label>
                    <Select value={profile.region} onValueChange={(v) => setProfile({...profile, region: v})}>
                      <SelectTrigger className="text-base sm:text-lg py-3 sm:py-6">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UKRAINE_REGIONS.map(r => (
                          <SelectItem key={r} value={r}>
                            {r === "Автономна Республіка Крим" ? r : `${r} область`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Місто / Село</label>
                    <Input value={profile.city} onChange={(e) => setProfile({...profile, city: e.target.value})} className="text-base sm:text-lg py-3 sm:py-6" />
                  </div>
                  <Button className="w-full py-3 sm:py-6 text-lg rounded-2xl" onClick={() => saveProfile(profile)}>
                    Зберегти зміни
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      Власний ключ Gemini API
                    </label>
                    <Input 
                      type="password" 
                      placeholder="AIzaSy..." 
                      value={customApiKey}
                      onChange={(e) => saveApiKey(e.target.value)}
                      className="text-base sm:text-lg py-3 sm:py-6"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Якщо стандартний ключ не працює, ви можете <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary underline">створити власний безкоштовний ключ</a> та вставити його сюди. Він зберігається лише на вашому пристрої.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <Button variant="destructive" className="w-full py-3 sm:py-6 text-lg rounded-2xl" onClick={() => {
                    localStorage.removeItem('sadyba_profile');
                    localStorage.removeItem('sadyba_plants');
                    localStorage.removeItem('sadyba_activities');
                    localStorage.removeItem('custom_gemini_api_key');
                    setProfile(null);
                    setPlants([]);
                    setActivities([]);
                    setCustomApiKey('');
                    setActiveTab('home');
                    toast.success('Дані очищено');
                  }}>
                    Очистити всі дані
                  </Button>
                </CardContent>
              </Card>

              <div className="text-center text-muted-foreground text-sm space-y-1">
                <p>Версія 1.2.0 "Магнолія"</p>
                <p className="text-[10px] opacity-30">
                  Режим: Гібридний (ШІ + Офлайн)
                </p>
                <p>© 2026 Садиба UA</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Plant Advice Modal */}
      <AnimatePresence>
        {selectedPlant && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-background w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 bg-primary text-primary-foreground flex justify-between items-center">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-serif">{selectedPlant.name}</h2>
                  <p className="opacity-90">{selectedPlant.variety}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setSelectedPlant(null)}>
                  <ArrowLeft size={24} />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-8">
                  <div className="flex items-center justify-between text-primary">
                    <div className="flex items-center gap-2">
                      <Info size={20} />
                      <span className="font-bold uppercase tracking-wider text-sm">Поради агронома</span>
                    </div>
                    {!isLoadingAdvice && plantAdvice && (
                      <Badge variant={adviceSource === 'ai' ? 'default' : 'secondary'} className="flex items-center gap-1">
                        {adviceSource === 'ai' ? <Sparkles size={12} /> : <BookOpen size={12} />}
                        {adviceSource === 'ai' ? 'Згенеровано ШІ' : 'З довідника'}
                      </Badge>
                    )}
                  </div>
                  
                  {isLoadingAdvice ? (
                    <div className="flex flex-col items-center py-12 gap-4 text-muted-foreground">
                      <Loader2 className="animate-spin" size={48} />
                      <p className="text-lg">Готуємо персональну довідку...</p>
                    </div>
                  ) : plantAdvice ? (
                    <div className="space-y-8">
                      {plantAdvice.sections.map((section, idx) => (
                        <div key={idx} className="space-y-2">
                          <h4 className="text-lg font-bold text-primary flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-secondary" /> {section.title}
                          </h4>
                          <p className="text-lg leading-relaxed text-muted-foreground">
                            {renderTextWithProducts(section.content, plantAdvice.products)}
                          </p>
                        </div>
                      ))}
                      
                      <div className="bg-secondary/20 p-6 rounded-3xl border border-secondary/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <Sprout size={80} className="text-secondary" />
                        </div>
                        <h4 className="font-bold text-secondary mb-2 flex items-center gap-2">
                          <MessageSquare size={18} /> Секрет господаря
                        </h4>
                        <p className="text-lg italic text-primary relative z-10 font-medium">
                          {renderTextWithProducts(plantAdvice.secretTip, plantAdvice.products)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-muted-foreground">Не вдалося завантажити поради.</p>
                      <Button 
                        variant="outline" 
                        onClick={() => selectedPlant && showPlantAdvice(selectedPlant)}
                        className="rounded-2xl"
                      >
                        Спробувати ще раз
                      </Button>
                    </div>
                  )}

                  <div className="pt-6 border-t space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-bold text-lg flex items-center gap-2">
                          <Calendar size={20} className="text-secondary" /> Заплановано
                        </h4>
                        <div className="space-y-3">
                          {activities.filter(a => a.plantId === selectedPlant.id && a.status === 'planned').length === 0 ? (
                            <p className="text-muted-foreground text-sm italic">Немає запланованих робіт.</p>
                          ) : (
                            activities.filter(a => a.plantId === selectedPlant.id && a.status === 'planned').map(activity => (
                              <div key={activity.id} className="flex gap-3 items-start p-3 bg-secondary/5 border border-secondary/10 rounded-xl group">
                                <button 
                                  onClick={() => toggleActivityStatus(activity.id)}
                                  className="mt-1 w-5 h-5 rounded-full border-2 border-secondary flex items-center justify-center hover:bg-secondary/20 transition-colors"
                                  title="Позначити як виконане"
                                >
                                  <div className="w-2 h-2 rounded-full bg-secondary opacity-0 group-hover:opacity-50" />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium break-words">{activity.action}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(activity.date).toLocaleDateString('uk-UA')}
                                  </p>
                                  {activity.notes && <p className="text-sm mt-1">{activity.notes}</p>}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold text-lg flex items-center gap-2">
                          <CheckCircle2 size={20} className="text-green-600" /> Виконано
                        </h4>
                        <div className="space-y-3">
                          {activities.filter(a => a.plantId === selectedPlant.id && (a.status === 'completed' || !a.status)).length === 0 ? (
                            <p className="text-muted-foreground text-sm italic">Історія порожня.</p>
                          ) : (
                            activities.filter(a => a.plantId === selectedPlant.id && (a.status === 'completed' || !a.status)).slice(0, 10).map(activity => (
                              <div key={activity.id} className="flex gap-3 items-start p-3 bg-muted/30 rounded-xl">
                                <CheckCircle2 size={16} className="text-green-600 mt-1" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium break-words">{activity.action}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(activity.date).toLocaleDateString('uk-UA')}
                                  </p>
                                  {activity.notes && <p className="text-sm mt-1">{activity.notes}</p>}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        variant="secondary" 
                        className="w-full gap-2 rounded-2xl py-3 sm:py-6"
                        onClick={() => exportToPDF(selectedPlant)}
                        disabled={activities.filter(a => a.plantId === selectedPlant.id).length === 0 && !plantAdvice}
                      >
                        <FileDown size={20} /> Зберегти звіт у PDF (поради + історія)
                      </Button>
                      
                      {/* Hidden PDF Template */}
                      {selectedPlant && (
                        <div 
                          id={`pdf-report-${selectedPlant.id}`} 
                          style={{ display: 'none', width: '210mm', padding: '20mm', background: 'white' }}
                          className="font-sans text-black"
                        >
                          <div style={{ borderBottom: '2px solid #1a4332', paddingBottom: '10px', marginBottom: '20px' }}>
                            <h1 style={{ fontSize: '28pt', color: '#1a4332', margin: 0 }}>Садиба UA: Звіт</h1>
                            <p style={{ fontSize: '14pt', color: '#666' }}>Персональний журнал догляду</p>
                          </div>
                          
                          <div style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '22pt', marginBottom: '10px' }}>{selectedPlant.name}</h2>
                            <p style={{ fontSize: '16pt' }}><strong>Сорт:</strong> {selectedPlant.variety}</p>
                            <p style={{ fontSize: '14pt' }}><strong>Локація:</strong> {profile?.city}, {profile?.region}</p>
                          </div>

                          {plantAdvice && (
                            <div style={{ marginBottom: '30px' }}>
                              <h3 style={{ fontSize: '18pt', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '15px' }}>Поради агронома</h3>
                              {plantAdvice.sections.map((section, idx) => (
                                <div key={idx} style={{ marginBottom: '15px' }}>
                                  <h4 style={{ fontSize: '14pt', fontWeight: 'bold', color: '#1a4332', marginBottom: '5px' }}>{section.title}</h4>
                                  <p style={{ fontSize: '12pt', lineHeight: '1.5', color: '#333' }}>{section.content}</p>
                                </div>
                              ))}
                              {plantAdvice.secretTip && (
                                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9f1', borderLeft: '4px solid #1a4332', borderRadius: '4px' }}>
                                  <h4 style={{ fontSize: '14pt', fontWeight: 'bold', color: '#1a4332', marginBottom: '5px' }}>Секрет господаря</h4>
                                  <p style={{ fontSize: '12pt', fontStyle: 'italic', lineHeight: '1.5' }}>{plantAdvice.secretTip}</p>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <h3 style={{ fontSize: '18pt', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '15px' }}>Історія робіт</h3>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#1a4332', color: 'white' }}>
                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Дата</th>
                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Дія</th>
                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Статус</th>
                                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Деталі</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activities.filter(a => a.plantId === selectedPlant.id).map(activity => (
                                <tr key={activity.id}>
                                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{new Date(activity.date).toLocaleDateString('uk-UA')}</td>
                                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{activity.action}</td>
                                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{activity.status === 'planned' ? 'Заплановано' : 'Виконано'}</td>
                                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{activity.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          
                          <div style={{ marginTop: '60px', padding: '15px', borderTop: '1px solid #1a4332', fontSize: '12pt', color: '#1a4332', textAlign: 'center', fontWeight: '500' }}>
                            Згенеровано додатком Садиба UA • Дата формування звіту: {new Date().toLocaleString('uk-UA')}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <h4 className="font-bold pt-4">Дії</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <AddActivityDialog 
                        plants={plants} 
                        preSelectedPlantId={selectedPlant.id} 
                        onAdd={addActivity} 
                        trigger={
                          <Button variant="outline" className="justify-start gap-3 py-3 sm:py-6 text-lg rounded-2xl h-auto w-full">
                            <Plus className="text-primary" /> Записати нову дію
                          </Button>
                        }
                      />
                      <Button variant="destructive" className="justify-start gap-3 py-3 sm:py-6 text-lg rounded-2xl h-auto" onClick={() => {
                        deletePlant(selectedPlant.id);
                        setSelectedPlant(null);
                      }}>
                        Видалити з мого саду
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-5 sm:p-8 bg-accent text-white text-center relative">
                <h3 className="text-2xl sm:text-3xl font-serif">{selectedProduct.name}</h3>
                <p className="opacity-90">Інструкція та опис препарату</p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 text-white hover:bg-white/20" 
                  onClick={() => setSelectedProduct(null)}
                >
                  <Plus className="rotate-45" size={24} />
                </Button>
              </div>
              <ScrollArea className="max-h-[70vh]">
                <div className="p-5 sm:p-8 space-y-6">
                  <div className="space-y-2">
                    <h4 className="font-bold text-accent flex items-center gap-2">
                      <Info size={18} /> Що це за препарат?
                    </h4>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-bold text-accent flex items-center gap-2">
                      <Sprout size={18} /> Як розводити та застосовувати?
                    </h4>
                    <div className="bg-accent/5 p-4 rounded-2xl border border-accent/10">
                      <p className="text-lg text-foreground leading-relaxed">
                        {selectedProduct.usage}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-bold text-amber-600 flex items-center gap-2">
                      <Info size={18} /> Заходи безпеки
                    </h4>
                    <p className="text-base text-muted-foreground italic">
                      {selectedProduct.safety}
                    </p>
                  </div>
                  
                  <Button className="w-full py-3 sm:py-6 text-lg rounded-2xl bg-accent hover:bg-accent/90" onClick={() => setSelectedProduct(null)}>
                    Зрозуміло
                  </Button>
                </div>
              </ScrollArea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-muted p-2 pb-6 flex justify-around items-center z-30 max-w-2xl mx-auto rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <NavButton active={activeTab === 'home'} icon={<CloudSun />} label="Головна" onClick={() => setActiveTab('home')} />
        <NavButton active={activeTab === 'garden'} icon={<Sprout />} label="Мій Сад" onClick={() => setActiveTab('garden')} />
        <NavButton active={activeTab === 'calendar'} icon={<Calendar />} label="Календар" onClick={() => setActiveTab('calendar')} />
        <NavButton active={activeTab === 'settings'} icon={<Settings />} label="Налаштування" onClick={() => setActiveTab('settings')} />
      </nav>

      {/* Install PWA Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-50 bg-white p-4 rounded-3xl shadow-2xl border border-muted flex flex-col gap-4 max-w-md mx-auto"
          >
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                <Download size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Встановити додаток</h3>
                <p className="text-sm text-muted-foreground">Додайте Садиба UA на головний екран для швидкого доступу та роботи офлайн.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={dismissInstall}>Пізніше</Button>
              <Button className="flex-1 rounded-xl" onClick={handleInstall}>Встановити</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="top-center" expand={false} richColors />
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 transition-all ${active ? 'text-primary scale-110' : 'text-muted-foreground'}`}
    >
      <div className={`${active ? 'bg-primary/10 p-2 rounded-xl' : ''}`}>
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function Onboarding({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="bg-primary w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-xl rotate-3">
            <Sprout size={48} className="text-white" />
          </div>
          <h1 className="text-5xl font-serif text-primary">Садиба UA</h1>
          <p className="text-lg text-muted-foreground">Ваш розумний помічник у саду</p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-primary/5 p-8 text-center">
            <CardTitle className="text-xl sm:text-2xl">Давайте познайомимось</CardTitle>
            <CardDescription className="text-lg">Це допоможе нам давати точні поради для вашого регіону</CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Як вас звати?</label>
              <Input 
                placeholder="Ваше ім'я" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="text-lg py-8 rounded-2xl border-2 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Де ви господарюєте?</label>
              <Select onValueChange={setRegion}>
                <SelectTrigger className="text-lg py-8 rounded-2xl border-2">
                  <SelectValue placeholder="Оберіть область" />
                </SelectTrigger>
                <SelectContent>
                  {UKRAINE_REGIONS.map(r => (
                    <SelectItem key={r} value={r}>
                      {r === "Автономна Республіка Крим" ? r : `${r} область`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Input 
                placeholder="Ваше місто або село" 
                value={city} 
                onChange={(e) => setCity(e.target.value)}
                className="text-lg py-8 rounded-2xl border-2 focus:border-primary transition-all"
              />
            </div>
            <Button 
              className="w-full py-8 text-xl sm:text-2xl rounded-2xl shadow-lg hover:shadow-xl transition-all" 
              disabled={!name || !region || !city}
              onClick={() => onComplete({ name, region, city })}
            >
              Розпочати <ChevronRight className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function AddPlantDialog({ onAdd }: { onAdd: (name: string, variety: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [variety, setVariety] = useState('');

  const handleSubmit = () => {
    if (name) {
      onAdd(name, variety);
      setName('');
      setVariety('');
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Button onClick={() => setOpen(true)} className="rounded-2xl gap-2 py-3 sm:py-6 px-6 text-lg shadow-md">
        <Plus size={24} /> Додати рослину
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 sm:p-8 bg-primary text-primary-foreground text-center shrink-0">
                <h3 className="text-2xl sm:text-3xl font-serif">Нова рослина</h3>
                <p className="opacity-90">Що ви посадили у своєму саду?</p>
              </div>
              <div className="p-4 sm:p-8 flex flex-col overflow-hidden">
                <div className="space-y-4 sm:space-y-6 overflow-y-auto pr-2 pb-2 flex-1">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Назва (напр. Яблуня)</label>
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      className="text-lg py-3 sm:py-6 rounded-2xl border-2"
                      placeholder="Що це за рослина?"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Сорт (напр. Білий налив)</label>
                    <Input 
                      value={variety} 
                      onChange={(e) => setVariety(e.target.value)}
                      className="text-lg py-3 sm:py-6 rounded-2xl border-2"
                      placeholder="Який це сорт?"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t mt-2 shrink-0">
                  <Button variant="outline" className="flex-1 py-3 sm:py-6 text-lg rounded-2xl" onClick={() => setOpen(false)}>
                    Скасувати
                  </Button>
                  <Button className="flex-1 py-3 sm:py-6 text-lg rounded-2xl" onClick={handleSubmit} disabled={!name}>
                    Додати
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddActivityDialog({ 
  plants, 
  onAdd, 
  preSelectedPlantId, 
  trigger 
}: { 
  plants: Plant[], 
  onAdd: (action: string, status: 'planned' | 'completed', date: string, plant?: Plant, notes?: string) => void,
  preSelectedPlantId?: string,
  trigger?: ReactNode
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState(preSelectedPlantId || 'none');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'planned' | 'completed'>('completed');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    if (action) {
      const plant = plants.find(p => p.id === selectedPlantId);
      onAdd(action, status, new Date(date).toISOString(), plant, notes);
      setAction('');
      setNotes('');
      setOpen(false);
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setOpen(true)} className="rounded-2xl gap-2 py-3 sm:py-6 px-6 text-lg shadow-md">
          <Plus size={24} /> Записати роботу
        </Button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 sm:p-8 bg-secondary text-white text-center shrink-0">
                <h3 className="text-2xl sm:text-3xl font-serif">Журнал робіт</h3>
                <p className="opacity-90">Заплануйте або запишіть виконане</p>
              </div>
              <div className="p-4 sm:p-8 flex flex-col overflow-hidden">
                <div className="space-y-4 sm:space-y-6 overflow-y-auto pr-2 pb-2 flex-1">
                  <div className="flex p-1 bg-muted rounded-xl shrink-0">
                    <button 
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${status === 'completed' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
                      onClick={() => setStatus('completed')}
                    >
                      Виконано
                    </button>
                    <button 
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${status === 'planned' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
                      onClick={() => setStatus('planned')}
                    >
                      Запланувати
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Дата</label>
                    <Input 
                      type="date"
                      value={date} 
                      onChange={(e) => setDate(e.target.value)}
                      className="text-base sm:text-lg py-3 sm:py-6 rounded-2xl border-2 focus:border-secondary transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Що зробити/зроблено?</label>
                    <Input 
                      value={action} 
                      onChange={(e) => setAction(e.target.value)}
                      className="text-base sm:text-lg py-3 sm:py-6 rounded-2xl border-2 focus:border-secondary transition-all"
                      placeholder="Напр. Полив, Обрізка..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Для якої рослини?</label>
                    <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
                      <SelectTrigger className="text-base sm:text-lg py-3 sm:py-6 rounded-2xl border-2">
                        <SelectValue placeholder="Оберіть рослину" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Загальна робота</SelectItem>
                        {plants.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.variety})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Нотатки</label>
                    <Input 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)}
                      className="text-base sm:text-lg py-3 sm:py-6 rounded-2xl border-2 focus:border-secondary transition-all"
                      placeholder="Деталі..."
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t mt-2 shrink-0">
                  <Button variant="outline" className="flex-1 py-3 sm:py-6 rounded-2xl" onClick={() => setOpen(false)}>
                    Скасувати
                  </Button>
                  <Button className="flex-1 py-3 sm:py-6 rounded-2xl bg-secondary hover:bg-secondary/90" onClick={handleSubmit} disabled={!action}>
                    Зберегти
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
