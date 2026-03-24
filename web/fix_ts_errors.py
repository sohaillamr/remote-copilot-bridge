import re

# 1. Fix Chat.tsx
with open('src/pages/app/Chat.tsx', 'r', encoding='utf-8') as f:
    chat_content = f.read()
chat_content = chat_content.replace("  const [searchTerm, setSearchTerm] = useState('')\n  const [searchTerm, setSearchTerm] = useState('')", "  const [searchTerm, setSearchTerm] = useState('')")
with open('src/pages/app/Chat.tsx', 'w', encoding='utf-8') as f:
    f.write(chat_content)

# 2. Fix Settings.tsx
with open('src/pages/app/Settings.tsx', 'r', encoding='utf-8') as f:
    settings_content = f.read()

# remove unused imports
settings_content = re.sub(r'GraduationCap,\s*', '', settings_content)

# fix duplicate states for selectedPlan and seatCount
dup_state = \"\"\"    const [selectedPlan, setSelectedPlan] = useState<'pro' | 'team'>('pro')
    const [seatCount, setSeatCount] = useState<number>(1)
    const [selectedPlan, setSelectedPlan] = useState<'pro' | 'team'>('pro')
    const [seatCount, setSeatCount] = useState<number>(1)\"\"\"
single_state = \"\"\"    const [selectedPlan, setSelectedPlan] = useState<'pro' | 'team'>('pro')
    const [seatCount, setSeatCount] = useState<number>(1)\"\"\"
if dup_state in settings_content:
    settings_content = settings_content.replace(dup_state, single_state)

# fix duplicate pricing calculation
dup_pricing = \"\"\"    // Pricing Calculation
    const getPricePerSeat = (seats: number) => {
      if (seats >= 10) return 8;
      if (seats >= 5) return 10;
      return 12; // Base price dropped from 24 to 12
    }

    const totalPrice = selectedPlan === 'pro' ? 12 : getPricePerSeat(seatCount) * seatCount;


    // Pricing Calculation
    const getPricePerSeat = (seats: number) => {
      if (seats >= 10) return 8;
      if (seats >= 5) return 10;
      return 12; // Base price dropped from 24 to 12
    }
    
    const totalPrice = selectedPlan === 'pro' ? 12 : getPricePerSeat(seatCount) * seatCount;\"\"\"
single_pricing = \"\"\"    // Pricing Calculation
    const getPricePerSeat = (seats: number) => {
      if (seats >= 10) return 8;
      if (seats >= 5) return 10;
      return 12; // Base price dropped from 24 to 12
    }
    const totalPrice = selectedPlan === 'pro' ? 12 : getPricePerSeat(seatCount) * seatCount;\"\"\"
if dup_pricing in settings_content:
    settings_content = settings_content.replace(dup_pricing, single_pricing)

with open('src/pages/app/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(settings_content)


# 3. Fix TeamSettings.tsx
with open('src/pages/app/TeamSettings.tsx', 'r', encoding='utf-8') as f:
    team_content = f.read()

team_content = team_content.replace(\", Check, Copy\", \"\")
team_content = team_content.replace(\"import { toast } from 'sonner'\", \"import { useRelay } from '../../contexts/AgentRelayContext'\")
team_content = team_content.replace(\"const { user } = useAuth()\", \"const { user } = useAuth()\\n  const { addToast } = useRelay()\")
team_content = team_content.replace(\"toast.error\", \"addToast\")
team_content = team_content.replace(\"toast.success\", \"addToast\")
team_content = team_content.replace(\"toast.info\", \"addToast\")

with open('src/pages/app/TeamSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(team_content)


# 4. Fix Landing.tsx
with open('src/pages/Landing.tsx', 'r', encoding='utf-8') as f:
    landing_content = f.read()

landing_content = landing_content.replace(\"GraduationCap,\", \"\")
landing_content = re.sub(r'Users,\s*Users,\s*Users,', 'Users,', landing_content)

with open('src/pages/Landing.tsx', 'w', encoding='utf-8') as f:
    f.write(landing_content)
    
# 5. Fix Pair.tsx
with open('src/pages/Pair.tsx', 'r', encoding='utf-8') as f:
    pair_content = f.read()

pair_content = re.sub(r'const displayCode = pairToken\s*', '', pair_content)
with open('src/pages/Pair.tsx', 'w', encoding='utf-8') as f:
    f.write(pair_content)

print(\"All fixed\")
