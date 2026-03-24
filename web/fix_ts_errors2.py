import re

with open('src/pages/app/Chat.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace("const [searchTerm, setSearchTerm] = useState('')\n  const [searchTerm, setSearchTerm] = useState('')", "const [searchTerm, setSearchTerm] = useState('')")
with open('src/pages/app/Chat.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

with open('src/pages/app/Settings.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace("GraduationCap, ", "")
c = re.sub(r'const \[selectedPlan, setSelectedPlan\] = useState<\'pro\' \| \'team\'>\(\'pro\'\)\s*const \[seatCount, setSeatCount\] = useState<number>\(1\)\s*const \[selectedPlan, setSelectedPlan\] = useState<\'pro\' \| \'team\'>\(\'pro\'\)\s*const \[seatCount, setSeatCount\] = useState<number>\(1\)', "const [selectedPlan, setSelectedPlan] = useState<'pro' | 'team'>('pro')\n    const [seatCount, setSeatCount] = useState<number>(1)", c)
c = re.sub(r'// Pricing Calculation.*?const totalPrice = .*?\n\s*// Pricing Calculation.*?const totalPrice = [^\n]+', "    // Pricing Calculation\n    const getPricePerSeat = (seats: number) => {\n      if (seats >= 10) return 8;\n      if (seats >= 5) return 10;\n      return 12;\n    }\n    const totalPrice = selectedPlan === 'pro' ? 12 : getPricePerSeat(seatCount) * seatCount;", c, flags=re.DOTALL)
c = c.replace("import { useAuth } from '../../hooks/useAuth'\\nimport TeamSettings from './TeamSettings'", "import { useAuth } from '../../hooks/useAuth'\nimport TeamSettings from './TeamSettings'")
with open('src/pages/app/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

with open('src/pages/app/TeamSettings.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace(", Check, Copy", "")
c = c.replace("import { toast } from 'sonner'", "import { useRelay } from '../../contexts/AgentRelayContext'")
c = c.replace("const { user } = useAuth()", "const { user } = useAuth()\n  const { addToast } = useRelay()")
c = c.replace("toast.error(", "addToast(")
c = c.replace("toast.success(", "addToast(")
c = c.replace("'Failed to send invite')", "'Failed to send invite', 'error')")
c = c.replace("'Invite sent!')", "'Invite sent!', 'success')")
with open('src/pages/app/TeamSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

with open('src/pages/Landing.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace("GraduationCap,", "")
c = re.sub(r'Users,\s*Users,\s*Users,', 'Users,', c)
with open('src/pages/Landing.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

with open('src/pages/Pair.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = re.sub(r'const displayCode = pairToken\s*', '', c)
with open('src/pages/Pair.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("done")
