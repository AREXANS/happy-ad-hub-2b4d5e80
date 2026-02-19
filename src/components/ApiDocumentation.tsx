import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Copy, Code, MessageSquare, Gamepad2, Globe, Server, FileJson, PlusCircle, Pencil, Trash2, CheckCircle } from 'lucide-react';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const ApiDocumentation = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'whatsapp' | 'roblox' | 'javascript'>('overview');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Disalin!', description: `${label} berhasil disalin ke clipboard` });
  };

  const codeBlocks = {
    getAllKeys: `// GET ALL KEYS - Mengambil semua data key
async function getAllKeys() {
  const response = await fetch('${API_BASE}/get-keys');
  const data = await response.json();
  
  console.log('Total keys:', data.count);
  console.log('Keys:', data.keys);
  
  // Response format:
  // {
  //   keys: [
  //     {
  //       key: "AXSTOOLS-XXXX-XXXX",
  //       expired: "2026-01-30T00:00:00.000Z",
  //       created: "2026-01-20T00:00:00.000Z",
  //       role: "VIP",
  //       maxHwid: 1,
  //       Freeze: false,
  //       frozenUntil: null,
  //       frozenRemainingMs: null,
  //       hwids: ["hwid-1", "hwid-2"],
  //       robloxUsers: [
  //         { 
  //           hwid: "hwid-1", 
  //           username: "Player1", 
  //           registeredAt: "2026-01-21T06:59:04.478Z" 
  //         }
  //       ]
  //     }
  //   ],
  //   count: 1
  // }
  
  return data;
}

// DELETE ALL KEYS - Menghapus semua key
async function deleteAllKeys() {
  const allKeys = await getAllKeys();
  const results = { success: 0, failed: 0 };
  
  for (const keyItem of allKeys.keys) {
    try {
      const res = await fetch('${API_BASE}/delete-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyItem.key })
      });
      const data = await res.json();
      if (data.success) results.success++;
      else results.failed++;
    } catch {
      results.failed++;
    }
  }
  
  console.log('Delete All Result:', results);
  return results;
}`,

    createKey: `// CREATE KEY - Membuat key baru
async function createKey(options = {}) {
  const response = await fetch('${API_BASE}/create-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: options.key || '',  // Kosong = auto generate AXSTOOLS-XXXX-XXXX
      role: options.role || 'VIP',  // Developer, VIP, NORMAL, Free
      expired: options.expired || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      max_hwid: options.maxHwid || 1,
      Freeze: options.freeze || false  // Status freeze awal
    })
  });
  
  const result = await response.json();
  // Response: { success: true, key: "AXSTOOLS-XXXX-XXXX", message: "..." }
  // atau: { success: false, error: "..." }
  
  return result;
}

// Contoh penggunaan:
await createKey(); // Auto generate key VIP 7 hari
await createKey({ role: 'Developer', maxHwid: 3 }); // Developer dengan 3 HWID
await createKey({ key: 'CUSTOM-KEY-123', expired: '2026-12-31T23:59:59Z' });
await createKey({ key: 'axstoolsdev', role: 'Developer', maxHwid: 1, freeze: false });`,

    updateKey: `// UPDATE KEY - Mengubah data key
async function updateKey(keyName, updates) {
  const response = await fetch('${API_BASE}/update-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: keyName,
      ...updates
    })
  });
  
  return await response.json();
}

// Contoh penggunaan:

// Mengubah role
await updateKey('AXSTOOLS-XXXX-XXXX', { role: 'Developer' });

// Memperpanjang expired
await updateKey('AXSTOOLS-XXXX-XXXX', { 
  expired: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
});

// Rename key
await updateKey('AXSTOOLS-XXXX-XXXX', { newKey: 'PREMIUM-USER-001' });

// Reset HWID dan Roblox Users
await updateKey('AXSTOOLS-XXXX-XXXX', { hwids: [], robloxUsers: [] });

// ============ FREEZE CONTROL ============

// Freeze key (pause expiry countdown)
// Saat di-freeze, sisa waktu disimpan dan countdown berhenti
const keyInfo = await getKeyInfo('AXSTOOLS-XXXX-XXXX');
const now = new Date();
const expiredDate = new Date(keyInfo.expired);
const remainingMs = expiredDate.getTime() - now.getTime();

await updateKey('AXSTOOLS-XXXX-XXXX', { 
  Freeze: true,
  frozenUntil: now.toISOString(),
  frozenRemainingMs: remainingMs > 0 ? remainingMs : 0
});

// Unfreeze key (resume expiry countdown)
// Saat di-unfreeze, expired dihitung ulang dari sisa waktu
const keyData = await getKeyInfo('AXSTOOLS-XXXX-XXXX');
const frozenRemainingMs = keyData.frozenRemainingMs || 0;
const newExpiry = new Date(Date.now() + frozenRemainingMs);

await updateKey('AXSTOOLS-XXXX-XXXX', { 
  Freeze: false,
  frozenUntil: null,
  frozenRemainingMs: null,
  expired: newExpiry.toISOString()
});

// Toggle freeze status
async function toggleFreeze(keyName) {
  const keys = await getAllKeys();
  const keyData = keys.keys.find(k => k.key === keyName);
  
  if (!keyData) return { success: false, error: 'Key not found' };
  
  if (keyData.Freeze || keyData.frozenUntil) {
    // Unfreeze
    const remainingMs = keyData.frozenRemainingMs || 0;
    return await updateKey(keyName, {
      Freeze: false,
      frozenUntil: null,
      frozenRemainingMs: null,
      expired: new Date(Date.now() + remainingMs).toISOString()
    });
  } else {
    // Freeze
    const now = new Date();
    const expiredDate = new Date(keyData.expired);
    const remainingMs = expiredDate.getTime() - now.getTime();
    return await updateKey(keyName, {
      Freeze: true,
      frozenUntil: now.toISOString(),
      frozenRemainingMs: remainingMs > 0 ? remainingMs : 0
    });
  }
}`,

    deleteKey: `// DELETE KEY - Menghapus key
async function deleteKey(keyName) {
  const response = await fetch('${API_BASE}/delete-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: keyName })
  });
  
  return await response.json();
  // Response: { success: true, message: "Key deleted" }
}

await deleteKey('AXSTOOLS-XXXX-XXXX');`,

    validateKey: `// VALIDATE KEY - Validasi dan registrasi HWID
async function validateKey(keyName, hwid, username) {
  const response = await fetch('${API_BASE}/validate-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: keyName,
      hwid: hwid,
      username: username
    })
  });
  
  const result = await response.json();
  // Response sukses: { valid: true, role: "VIP" }
  // Response gagal: { valid: false, error: "Key expired" / "Max HWID reached" / "Key not found" }
  
  return result;
}`,

    whatsappBot: `// ========================================
// WHATSAPP BOT INTEGRATION (Node.js)
// ========================================
// Menggunakan library: whatsapp-web.js atau baileys

const { Client } = require('whatsapp-web.js');
const axios = require('axios');

const API_BASE = '${API_BASE}';

// Inisialisasi WhatsApp client
const client = new Client();

client.on('ready', () => {
  console.log('WhatsApp Bot Ready!');
});

client.on('message', async (msg) => {
  const text = msg.body.toLowerCase();
  const sender = msg.from;

  // Command: !cekkey AXSTOOLS-XXXX-XXXX
  if (text.startsWith('!cekkey ')) {
    const key = msg.body.split(' ')[1];
    
    try {
      const res = await axios.get(\`\${API_BASE}/get-keys\`);
      const foundKey = res.data.keys.find(k => k.key === key);
      
      if (foundKey) {
        const expired = new Date(foundKey.expired);
        const now = new Date();
        const diff = expired - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        msg.reply(\`✅ *KEY VALID*
🔑 Key: \${foundKey.key}
👤 Role: \${foundKey.role}
📅 Expired: \${expired.toLocaleString('id-ID')}
⏰ Sisa: \${days} hari \${hours} jam
💻 HWID: \${foundKey.hwids.length}/\${foundKey.maxHwid}
🎮 Users: \${foundKey.robloxUsers.map(u => u.username).join(', ') || '-'}\`);
      } else {
        msg.reply('❌ Key tidak ditemukan!');
      }
    } catch (error) {
      msg.reply('❌ Gagal mengecek key: ' + error.message);
    }
  }

  // Command: !createkey [role] [days]
  if (text.startsWith('!createkey')) {
    const parts = msg.body.split(' ');
    const role = parts[1] || 'VIP';
    const days = parseInt(parts[2]) || 7;
    
    try {
      const res = await axios.post(\`\${API_BASE}/create-key\`, {
        key: '', // Auto generate
        role: role,
        expired: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        max_hwid: 1
      });
      
      if (res.data.success) {
        msg.reply(\`✅ *KEY BERHASIL DIBUAT*
🔑 Key: \${res.data.key}
👤 Role: \${role}
📅 Durasi: \${days} hari\`);
      } else {
        msg.reply('❌ Gagal membuat key: ' + res.data.error);
      }
    } catch (error) {
      msg.reply('❌ Error: ' + error.message);
    }
  }

  // Command: !deletekey AXSTOOLS-XXXX-XXXX
  if (text.startsWith('!deletekey ')) {
    const key = msg.body.split(' ')[1];
    
    try {
      const res = await axios.post(\`\${API_BASE}/delete-key\`, { key });
      
      if (res.data.success) {
        msg.reply('✅ Key berhasil dihapus!');
      } else {
        msg.reply('❌ Gagal: ' + res.data.error);
      }
    } catch (error) {
      msg.reply('❌ Error: ' + error.message);
    }
  }

  // Command: !resethwid AXSTOOLS-XXXX-XXXX
  if (text.startsWith('!resethwid ')) {
    const key = msg.body.split(' ')[1];
    
    try {
      const res = await axios.post(\`\${API_BASE}/update-key\`, {
        key: key,
        hwids: [],
        robloxUsers: []
      });
      
      if (res.data.success) {
        msg.reply('✅ HWID berhasil direset!');
      } else {
        msg.reply('❌ Gagal: ' + res.data.error);
      }
    } catch (error) {
      msg.reply('❌ Error: ' + error.message);
    }
  }

  // Command: !listkeys
  if (text === '!listkeys') {
    try {
      const res = await axios.get(\`\${API_BASE}/get-keys\`);
      const keys = res.data.keys.slice(0, 10); // Max 10 keys
      
      let message = \`📋 *DAFTAR KEY (\${res.data.count} total)*\\n\\n\`;
      keys.forEach((k, i) => {
        message += \`\${i+1}. \${k.key}\\n   Role: \${k.role} | HWID: \${k.hwids.length}/\${k.maxHwid}\\n\\n\`;
      });
      
      msg.reply(message);
    } catch (error) {
      msg.reply('❌ Error: ' + error.message);
    }
  }

  // Command: !help
  if (text === '!help') {
    msg.reply(\`🤖 *AXS KEY SYSTEM BOT*

*Commands:*
!cekkey <key> - Cek status key
!createkey [role] [days] - Buat key baru
!deletekey <key> - Hapus key
!resethwid <key> - Reset HWID
!listkeys - Lihat daftar key

*Roles:* Developer, VIP, NORMAL, Free\`);
  }
});

client.initialize();`,

    robloxScript: `-- ====================================================================
-- == AREXANS TOOLS - HWID AUTHENTICATION SYSTEM                    ==
-- ====================================================================

local HttpService = game:GetService("HttpService")
local CoreGui = game:GetService("CoreGui")
local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

-- Cleanup previous connections for keysystem if any (reusing the same global table if desired, or a new one)
if not _G.Arexans_Connections then
    _G.Arexans_Connections = {}
end

local function ConnectEvent(event, func)
    local conn = event:Connect(func)
    table.insert(_G.Arexans_Connections, conn)
    return conn
end

-- [[ FUNGSI DRAGGABLE ]] --
local saveGuiPositions -- Placeholder if needed, though mostly for main tool
local function MakeDraggable(guiObject, dragHandle, isDraggableCheck, clickCallback)
    local UserInputService = game:GetService("UserInputService")
    local dragInput = nil
    local dragStart = nil
    local startPos = nil
    local wasDragged = false

    ConnectEvent(dragHandle.InputBegan, function(input)
        if not (input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch) then return end
        if dragInput then return end

        if isDraggableCheck and not isDraggableCheck() then
            if clickCallback then
                -- Periksa lagi untuk memastikan ini bukan event yang tidak diinginkan
                local timeSinceBegan = tick()
                local endedConn
                endedConn = UserInputService.InputEnded:Connect(function(endInput)
                    if endInput.UserInputType == input.UserInputType then
                        -- [[ FIX: Pastikan input touch adalah object yang sama ]]
                        if endInput.UserInputType == Enum.UserInputType.Touch and endInput ~= input then
                            return
                        end

                        if tick() - timeSinceBegan < 0.2 then -- Hanya panggil jika itu klik cepat
                            clickCallback()
                        end
                        if endedConn then endedConn:Disconnect() end
                    end
                end)
            end
            return
        end
        
        dragInput = input
        dragStart = input.Position
        startPos = guiObject.Position
        wasDragged = false
    end)

    ConnectEvent(UserInputService.InputChanged, function(input)
        if dragInput then 
            -- [[ FIX: Logika Touch yang lebih ketat ]]
            local allowUpdate = false
            if input.UserInputType == Enum.UserInputType.MouseMovement then
                allowUpdate = true
            elseif input.UserInputType == Enum.UserInputType.Touch then
                if input == dragInput then
                    allowUpdate = true
                end
            end

            if allowUpdate then
                local newPos = input.Position
                local delta = newPos - dragStart
                guiObject.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
                if not wasDragged and delta.Magnitude > 5 then -- Threshold untuk dianggap sebagai seretan
                    wasDragged = true
                end
            end
        end
    end)

    ConnectEvent(UserInputService.InputEnded, function(input)
        if dragInput and input.UserInputType == dragInput.UserInputType then
            -- [[ FIX: Pastikan input touch adalah object yang sama ]]
            if input.UserInputType == Enum.UserInputType.Touch and input ~= dragInput then
                return
            end

            if not wasDragged and clickCallback then
                clickCallback()
            end
            dragInput = nil
        end
    end)
end

-- ================== CONFIG ==================
local API_URL = "${API_BASE}/validate-key"
local API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdGNlb3RvbGNnaHB5cWN0Z3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTIwMzAsImV4cCI6MjA4NDY2ODAzMH0.9r9SiUfpMAfH4dDGX4-cpILFYkoEHnGWjUZaxYDwlEU"

-- ================== HWID GENERATOR ==================
local function generateHWID()
    local hwid = ""
    local userId = tostring(LocalPlayer.UserId)
    
    -- Coba dapatkan HWID dari executor
    if gethwid then
        pcall(function()
            hwid = gethwid()
        end)
    elseif get_hwid then
        pcall(function()
            hwid = get_hwid()
        end)
    elseif syn and syn.hwid then
        pcall(function()
            hwid = syn.hwid()
        end)
    elseif getexecutorname then
        pcall(function()
            hwid = "RBLX-" .. userId .. "-" .. getexecutorname()
        end)
    else
        -- Fallback menggunakan UserId
        hwid = "RBLX-" .. userId
    end
    
    return hwid
end

-- ================== API VALIDATOR ==================
local function validateKeyWithAPI(keyInput)
    local hwid = generateHWID()
    local username = LocalPlayer.Name
    
    -- Gunakan request function yang tersedia
    local reqFunc = request or syn.request or http_request or HttpService.RequestAsync
    
    local success, result = pcall(function()
        return reqFunc({
            Url = API_URL,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["apikey"] = API_KEY,
                ["Authorization"] = "Bearer " .. API_KEY
            },
            Body = HttpService:JSONEncode({
                key = keyInput,
                hwid = hwid,
                robloxUsername = username
            })
        })
    end)
    
    if not success then
        return {
            valid = false,
            error = "Connection Error",
            message = "Gagal terhubung ke server"
        }
    end
    
    local responseBody = result.Body or result
    local data = {}
    
    local decodeSuccess, decodeResult = pcall(function()
        return HttpService:JSONDecode(responseBody)
    end)
    
    if decodeSuccess then
        data = decodeResult
    else
        return {
            valid = false,
            error = "JSON Error",
            message = "Gagal membaca respon server"
        }
    end
    
    return data
end

local function authenticateUser(inputKey)
    local result = validateKeyWithAPI(inputKey)
    
    if result.valid then
        -- Cek apakah key dibekukan (freeze)
        if result.frozen then
            return false, {
                reason = "FROZEN",
                message = "Key sedang dibekukan oleh admin" .. (result.frozenUntil and (" sampai " .. tostring(result.frozenUntil)) or "")
            }
        end
        
        -- Key valid dan tidak frozen
        local expirationTimestamp = nil
        if result.daysRemaining then
            -- Convert days remaining to timestamp roughly
            expirationTimestamp = os.time() + (result.daysRemaining * 86400)
        end
        
        -- Script URL handling could be added here if needed, but primarily we run local Arexanstools
        
        return true, {
            role = result.role or "Normal",
            expirationTimestamp = expirationTimestamp,
            message = "Akses diberikan",
            scriptUrl = result.scriptUrl -- Pass scriptUrl if available
        }
    else
        -- Key invalid
        return false, {
            message = result.error or result.message or "Key tidak valid"
        }
    end
end

-- [[ SESSION MANAGEMENT ]]
local SAVE_FOLDER = "ArexansTools"
if isfolder and not isfolder(SAVE_FOLDER) then
    pcall(makefolder, SAVE_FOLDER)
end
local SESSION_SAVE_FILE = SAVE_FOLDER .. "/ArexansTools_Session.json"

local function saveSession(expirationTimestamp, userRole, userkey)
    if not writefile then return end
    local sessionData = {
        expiration = expirationTimestamp,
        role = userRole,
        key = userkey
    }
    pcall(function()
        writefile(SESSION_SAVE_FILE, HttpService:JSONEncode(sessionData))
    end)
end

local function loadSession()
    if not readfile or not isfile or not isfile(SESSION_SAVE_FILE) then
        return nil, nil, nil -- No session file
    end
    local success, content = pcall(readfile, SESSION_SAVE_FILE)
    if not success then return nil, nil, nil end

    local success, data = pcall(HttpService.JSONDecode, HttpService, content)
    if not success or type(data) ~= "table" then return nil, nil, nil end

    -- Return key even if expired, but return nil for expiration and role if it is.
    if data.key then
        if data.expiration and os.time() < data.expiration then
            return data.expiration, data.role or "Normal", data.key
        else
            -- Session expired, but we still have a key to re-validate
            return nil, nil, data.key
        end
    end

    return nil, nil, nil -- No key in session
end

local function deleteSession()
    if isfile and isfile(SESSION_SAVE_FILE) and delfile then
        pcall(delfile, SESSION_SAVE_FILE)
    end
end

-- [[ LOAD AND RUN TOOL ]]
local function LoadAndRunTool(expirationTimestamp, userRole)
    local scriptUrl = "https://firestore.googleapis.com/v1/projects/sharexans2/databases/(default)/documents/artifacts/sharexans-v2/public/data/scripts/TKWtcePMmpJzaGLQiBVL"
    
    local success, toolChunk = pcall(function()
        return loadstring(game:GetService("HttpService"):JSONDecode(game:HttpGet(scriptUrl)).fields.content.stringValue)()
    end)

    if success and type(toolChunk) == "function" then
        local runSuccess, toolFunc = pcall(toolChunk)
        if runSuccess then
            if type(toolFunc) == "function" then
                toolFunc(expirationTimestamp, userRole)
            else
                 -- If it didn't return a function, assume it just ran successfully (legacy behavior)
                 -- or log a warning if we strictly expect a module. 
                 -- Given previous steps, we expect a function, but being robust is good.
                 if not toolFunc then
                     -- Maybe printed something?
                 else
                     warn("Tool loaded but returned " .. type(toolFunc) .. " instead of function.")
                 end
            end
        else
             warn("Failed to run tool script: " .. tostring(toolFunc))
        end
    else
        warn("Failed to load script from URL: " .. tostring(toolChunk))
    end
end

-- [[ KEY PROMPT GUI ]]
local function CreatekeyPromptGUI()
    local function RegisterButtonEffect(button, shouldFlash)
        if not button then return end
        
        button.AutoButtonColor = false -- Disable default behavior
        
        local originalTransparency = button.BackgroundTransparency

        local uiScale = button:FindFirstChild("ButtonScaleEffect")
        if not uiScale then
            uiScale = Instance.new("UIScale")
            uiScale.Name = "ButtonScaleEffect"
            uiScale.Parent = button
        end
        
        button.MouseButton1Down:Connect(function()
            TweenService:Create(uiScale, TweenInfo.new(0.1), {Scale = 0.95}):Play()
            if shouldFlash then
                -- Flash background (make it visible)
                local targetTransparency = math.max(0, originalTransparency - 0.2)
                if originalTransparency >= 0.9 then targetTransparency = 0.4 end
                TweenService:Create(button, TweenInfo.new(0.1), {BackgroundTransparency = targetTransparency}):Play()
            end
        end)
        
        local function restore()
            TweenService:Create(uiScale, TweenInfo.new(0.1), {Scale = 1}):Play()
            if shouldFlash then
                -- Restore background transparency
                TweenService:Create(button, TweenInfo.new(0.2), {BackgroundTransparency = originalTransparency}):Play()
            end
        end
        
        button.MouseButton1Up:Connect(restore)
        button.MouseLeave:Connect(restore)
    end

    -- ====================================================================
    -- == BAGIAN GUI PROMPT key                                   ==
    -- ====================================================================
    local keyScreenGui = Instance.new("ScreenGui")
    keyScreenGui.Name = "keyPromptGUI"
    keyScreenGui.Parent = CoreGui
    keyScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
    keyScreenGui.ResetOnSpawn = false

    local PromptFrame = Instance.new("Frame")
    PromptFrame.Name = "PromptFrame"
    PromptFrame.Size = UDim2.new(0, 250, 0, 130) -- [COMPACT] Reduced height
    PromptFrame.Position = UDim2.new(0.5, -125, 0.5, -65) -- [COMPACT] Recenter
    PromptFrame.BackgroundColor3 = Color3.fromRGB(10, 10, 10)
    PromptFrame.BackgroundTransparency = 0.2
    PromptFrame.BorderSizePixel = 0
    PromptFrame.Parent = keyScreenGui

    -- [MODIFIKASI] Outline Style untuk PromptFrame (seperti ArexansTools)
    local BorderFrame = Instance.new("Frame")
    BorderFrame.Name = "BorderFrame"
    BorderFrame.Size = UDim2.new(1, 0, 1, 0)
    BorderFrame.BackgroundTransparency = 1
    BorderFrame.ZIndex = 100 -- Selalu di atas
    BorderFrame.Parent = PromptFrame

    local UIStroke = Instance.new("UIStroke")
    UIStroke.Color = Color3.fromRGB(0, 150, 255)
    UIStroke.Thickness = 3 -- Lebih tebal
    UIStroke.Transparency = 0 -- Solid (tidak transparan)
    UIStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    UIStroke.Parent = BorderFrame

    -- [MODIFIKASI] Mengubah Title menjadi TextButton untuk handle drag
    local PromptTitle = Instance.new("TextButton")
    PromptTitle.Name = "Title"
    PromptTitle.Size = UDim2.new(1, 0, 0, 30)
    PromptTitle.BackgroundColor3 = Color3.fromRGB(25, 25, 25)
    PromptTitle.BackgroundTransparency = 1 -- [MODIFIKASI] Transparan
    PromptTitle.Text = "" -- Teks judul akan diatur oleh label terpisah
    PromptTitle.AutoButtonColor = false
    PromptTitle.Parent = PromptFrame

    -- Garis pemisah horizontal (Header | Body) - Mirip ArexansTools
    local HorizSeparator = Instance.new("Frame")
    HorizSeparator.Name = "HorizSeparator"
    HorizSeparator.Size = UDim2.new(1, 0, 0, 1)
    HorizSeparator.Position = UDim2.new(0, 0, 0, 30)
    HorizSeparator.BackgroundColor3 = Color3.fromRGB(0, 150, 255)
    HorizSeparator.BorderSizePixel = 0
    HorizSeparator.Parent = PromptFrame

    local PromptTitleLabel = Instance.new("TextLabel", PromptTitle)
    PromptTitleLabel.Name = "TitleLabel"
    PromptTitleLabel.Size = UDim2.new(1, 0, 1, 0) -- Isi seluruh parent
    PromptTitleLabel.Position = UDim2.new(0, 0, 0, 0)
    PromptTitleLabel.BackgroundTransparency = 1
    PromptTitleLabel.Text = "Key System Arexans Tools"
    PromptTitleLabel.Font = Enum.Font.SourceSansBold
    PromptTitleLabel.TextColor3 = Color3.fromRGB(0, 200, 255)
    PromptTitleLabel.TextSize = 14
    PromptTitleLabel.TextXAlignment = Enum.TextXAlignment.Center -- Pusatkan teks

    -- [MODIFIKASI] Menambahkan Tombol Close (X)
    local CloseButton = Instance.new("TextButton")
    CloseButton.Name = "CloseButton"
    CloseButton.Size = UDim2.new(0, 20, 0, 20)
    CloseButton.Position = UDim2.new(1, -15, 0.5, 0) -- Posisi disesuaikan
    CloseButton.AnchorPoint = Vector2.new(0.5, 0.5)
    CloseButton.BackgroundTransparency = 1
    CloseButton.Font = Enum.Font.SourceSansBold
    CloseButton.Text = "X"
    CloseButton.TextColor3 = Color3.fromRGB(255, 255, 255)
    CloseButton.BackgroundColor3 = Color3.fromRGB(200, 50, 50) -- Red for flash
    CloseButton.TextSize = 18
    CloseButton.Parent = PromptTitle
    RegisterButtonEffect(CloseButton, true)
    CloseButton.MouseButton1Click:Connect(function()
        keyScreenGui:Destroy()
    end)

    -- [MODIFIKASI] Membuat jendela dapat digeser
    pcall(function()
        MakeDraggable(PromptFrame, PromptTitle, function() return true end, nil)
    end)

    local keyBox = Instance.new("TextBox", PromptFrame)
    keyBox.Name = "keyBox"
    keyBox.Size = UDim2.new(1, -14, 0, 30) -- [COMPACT] Wider (smaller margin)
    keyBox.Position = UDim2.new(0, 7, 0, 35) -- [COMPACT] Tighter vertical spacing
    keyBox.BackgroundTransparency = 1
    keyBox.TextColor3 = Color3.fromRGB(220, 220, 220)
    keyBox.PlaceholderText = "Enter Key..."
    keyBox.Text = ""
    keyBox.Font = Enum.Font.SourceSans
    keyBox.TextSize = 14
    keyBox.ClearTextOnFocus = false
    
    local PassStroke = Instance.new("UIStroke", keyBox)
    PassStroke.Color = Color3.fromRGB(0, 150, 255)
    PassStroke.Thickness = 1
    PassStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    
    local PassCorner = Instance.new("UICorner", keyBox)
    PassCorner.CornerRadius = UDim.new(0, 5)

    local GetKeyButton = Instance.new("TextButton", PromptFrame)
    GetKeyButton.Name = "GetKeyButton"
    GetKeyButton.Size = UDim2.new(0.5, -10, 0, 30) -- [COMPACT] Wider
    GetKeyButton.AnchorPoint = Vector2.new(0.5, 0.5) -- [MODIFIKASI] Center anchor for scaling
    GetKeyButton.Position = UDim2.new(0.25, 2, 0, 85) -- [MODIFIKASI] Centered position
    GetKeyButton.BackgroundColor3 = Color3.fromRGB(50, 200, 50)
    GetKeyButton.BackgroundTransparency = 1 -- [MODIFIKASI] Transparan
    GetKeyButton.Text = "Get Key"
    GetKeyButton.Font = Enum.Font.SourceSansBold
    GetKeyButton.TextColor3 = Color3.fromRGB(50, 200, 50) -- [MODIFIKASI] Text Color to match stroke
    GetKeyButton.TextSize = 14
    local GetKeyCorner = Instance.new("UICorner", GetKeyButton)
    GetKeyCorner.CornerRadius = UDim.new(0, 5)
    local GetKeyStroke = Instance.new("UIStroke", GetKeyButton) -- [MODIFIKASI] Add Stroke
    GetKeyStroke.Color = Color3.fromRGB(50, 200, 50)
    GetKeyStroke.Thickness = 1
    GetKeyStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border

    local SubmitButton = Instance.new("TextButton", PromptFrame)
    SubmitButton.Name = "SubmitButton"
    SubmitButton.Size = UDim2.new(0.5, -10, 0, 30) -- [COMPACT] Wider
    SubmitButton.AnchorPoint = Vector2.new(0.5, 0.5) -- [MODIFIKASI] Center anchor for scaling
    SubmitButton.Position = UDim2.new(0.75, -2, 0, 85) -- [MODIFIKASI] Centered position
    SubmitButton.BackgroundColor3 = Color3.fromRGB(0, 150, 255)
    SubmitButton.BackgroundTransparency = 1 -- [MODIFIKASI] Transparan
    SubmitButton.Text = "Login"
    SubmitButton.Font = Enum.Font.SourceSansBold
    SubmitButton.TextColor3 = Color3.fromRGB(0, 150, 255) -- [MODIFIKASI] Text Color to match stroke
    SubmitButton.TextSize = 14
    local SubmitCorner = Instance.new("UICorner", SubmitButton)
    SubmitCorner.CornerRadius = UDim.new(0, 5)
    local SubmitStroke = Instance.new("UIStroke", SubmitButton) -- [MODIFIKASI] Add Stroke
    SubmitStroke.Color = Color3.fromRGB(0, 150, 255)
    SubmitStroke.Thickness = 1
    SubmitStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border

    local StatusLabel = Instance.new("TextLabel", PromptFrame)
    StatusLabel.Name = "StatusLabel"
    StatusLabel.Size = UDim2.new(1, -14, 0, 20) -- [COMPACT] Wider
    StatusLabel.Position = UDim2.new(0, 7, 0, 105) -- [COMPACT] Tighter vertical spacing
    StatusLabel.BackgroundTransparency = 1
    StatusLabel.Text = ""
    StatusLabel.Font = Enum.Font.SourceSans
    StatusLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
    StatusLabel.TextSize = 12

    RegisterButtonEffect(GetKeyButton, true)
    GetKeyButton.MouseButton1Click:Connect(function()
        if setclipboard then
            setclipboard("https://tools.arexans.biz.id")
            StatusLabel.Text = "Link copied to clipboard!"
            StatusLabel.TextColor3 = Color3.fromRGB(50, 255, 50)
        else
            StatusLabel.Text = "Clipboard not supported."
            StatusLabel.TextColor3 = Color3.fromRGB(255, 50, 50)
        end
    end)

    RegisterButtonEffect(SubmitButton, true)
    SubmitButton.MouseButton1Click:Connect(function()
        local enteredkey = keyBox.Text
        StatusLabel.Text = "Validating..."
        StatusLabel.TextColor3 = Color3.fromRGB(255, 255, 0)
        
        task.spawn(function()
            local isValid, result = authenticateUser(enteredkey)

            if isValid then
                pcall(saveSession, result.expirationTimestamp, result.role, enteredkey) -- Simpan sesi setelah login berhasil
                keyScreenGui:Destroy()
                
                -- [[ LOAD TOOL ]]
                LoadAndRunTool(result.expirationTimestamp, result.role)
                
                -- Info script (optional, copied from original)
                task.spawn(function()
                    local success, infoScript = pcall(function()
                        return loadstring(game:GetService("HttpService"):JSONDecode(game:HttpGet("https://firestore.googleapis.com/v1/projects/sharexans2/databases/(default)/documents/artifacts/sharexans-v2/public/data/scripts/cgENjfzTxfvBzW99yckS")).fields.content.stringValue)()
                    end)
                    if success and infoScript then
                        pcall(loadstring(infoScript))
                    end
                end)
            else
                StatusLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
                if result.reason == "FROZEN" then
                    StatusLabel.Text = result.message
                else
                    StatusLabel.Text = result.message or "key incorrect or expired."
                end
            end
        end)
    end)
end

-- ====================================================================
-- == MAIN STARTUP LOGIC                                           ==
-- ====================================================================
local savedExpiration, savedRole, savedkey = loadSession()

if savedkey then
    -- Validasi ulang key yang tersimpan dengan HWID
    local isValid, result = authenticateUser(savedkey)
    
    if isValid then
        -- Sukses! Server mengonfirmasi kata sandi dan sesi telah diperbarui.
        pcall(saveSession, result.expirationTimestamp, result.role, savedkey)
        LoadAndRunTool(result.expirationTimestamp, result.role)
    else
        -- Kata sandi yang tersimpan tidak lagi valid. Hapus sesi lama dan minta login.
        deleteSession()
        CreatekeyPromptGUI()
    end
else
    -- Tidak ada kata sandi yang tersimpan, perlu login manual.
    CreatekeyPromptGUI()
end`
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab; label: string; icon: any }) => (
    <Button
      variant={activeTab === id ? 'default' : 'outline'}
      className="gap-2"
      onClick={() => setActiveTab(id)}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Button>
  );

  const CodeBlock = ({ code, label }: { code: string; label: string }) => (
    <div className="relative group">
      <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
        {code}
      </pre>
      <Button
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => copyToClipboard(code, label)}
      >
        <Copy className="w-4 h-4 mr-1" />
        Salin
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex flex-wrap gap-2">
        <TabButton id="overview" label="Overview" icon={Globe} />
        <TabButton id="javascript" label="JavaScript" icon={Code} />
        <TabButton id="whatsapp" label="WhatsApp Bot" icon={MessageSquare} />
        <TabButton id="roblox" label="Roblox Lua" icon={Gamepad2} />
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card className="glass-card border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                API Base URL
              </CardTitle>
              <CardDescription>Gunakan URL ini untuk semua request API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-lg">
                <code className="flex-1 font-mono text-sm text-primary">{API_BASE}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(API_BASE, 'API URL')}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Endpoints Tersedia</CardTitle>
              <CardDescription>Semua API bersifat public tanpa autentikasi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 bg-muted/20 rounded-lg">
                  <FileJson className="w-8 h-8 text-blue-400 shrink-0" />
                  <div>
                    <h4 className="font-semibold">GET /get-keys</h4>
                    <p className="text-sm text-muted-foreground">Mengambil semua data key dalam format JSON</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted/20 rounded-lg">
                  <PlusCircle className="w-8 h-8 text-green-400 shrink-0" />
                  <div>
                    <h4 className="font-semibold">POST /create-key</h4>
                    <p className="text-sm text-muted-foreground">Membuat key baru dengan auto-generate atau custom</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted/20 rounded-lg">
                  <Pencil className="w-8 h-8 text-yellow-400 shrink-0" />
                  <div>
                    <h4 className="font-semibold">POST /update-key</h4>
                    <p className="text-sm text-muted-foreground">Update role, expired, HWID, freeze, rename key</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted/20 rounded-lg">
                  <Trash2 className="w-8 h-8 text-red-400 shrink-0" />
                  <div>
                    <h4 className="font-semibold">POST /delete-key</h4>
                    <p className="text-sm text-muted-foreground">Menghapus key dari database</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted/20 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-secondary shrink-0" />
                  <div>
                    <h4 className="font-semibold">POST /validate-key</h4>
                    <p className="text-sm text-muted-foreground">Validasi key dan registrasi HWID + username Roblox</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Format Data Key (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock 
                code={`{
  "key": "AXSTOOLS-XXXX-XXXX",
  "expired": "2026-01-30T00:00:00.000Z",
  "role": "VIP",  // Developer, VIP, NORMAL, Free
  "maxHwid": 1,
  "frozenUntil": null,  // null atau "frozen"
  "frozenRemainingMs": null,  // Sisa waktu saat freeze (ms)
  "hwids": ["hwid-string-1", "hwid-string-2"],
  "robloxUsers": [
    {
      "hwid": "hwid-string-1",
      "username": "RobloxPlayer",
      "registeredAt": "2026-01-21T07:02:27.302Z"
    }
  ]
}`}
                label="JSON Format"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* JavaScript Tab */}
      {activeTab === 'javascript' && (
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-400" />
                Get All Keys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={codeBlocks.getAllKeys} label="Get All Keys" />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-green-400" />
                Create Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={codeBlocks.createKey} label="Create Key" />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-yellow-400" />
                Update Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={codeBlocks.updateKey} label="Update Key" />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                Delete Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={codeBlocks.deleteKey} label="Delete Key" />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-secondary" />
                Validate Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={codeBlocks.validateKey} label="Validate Key" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* WhatsApp Tab */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <Card className="glass-card border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <MessageSquare className="w-5 h-5" />
                WhatsApp Bot Integration
              </CardTitle>
              <CardDescription>
                Gunakan library whatsapp-web.js atau baileys untuk membuat bot WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                <h4 className="font-semibold text-green-400 mb-2">Requirements:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Node.js v16 atau lebih tinggi</li>
                  <li>• npm install whatsapp-web.js axios</li>
                  <li>• Atau: npm install @whiskeysockets/baileys axios</li>
                </ul>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-400 mb-2">Commands yang tersedia:</h4>
                <ul className="text-sm space-y-1 font-mono">
                  <li>!help - Menampilkan bantuan</li>
                  <li>!cekkey &lt;key&gt; - Cek status key</li>
                  <li>!createkey [role] [days] - Buat key baru</li>
                  <li>!deletekey &lt;key&gt; - Hapus key</li>
                  <li>!resethwid &lt;key&gt; - Reset HWID</li>
                  <li>!listkeys - Lihat daftar key</li>
                </ul>
              </div>
              <CodeBlock code={codeBlocks.whatsappBot} label="WhatsApp Bot Code" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Roblox Tab */}
      {activeTab === 'roblox' && (
        <div className="space-y-6">
          <Card className="glass-card border-blue-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Gamepad2 className="w-5 h-5" />
                Roblox Lua Integration
              </CardTitle>
              <CardDescription>
                Script untuk validasi key di Roblox executor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-400 mb-2">Fitur:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Validasi key dengan HWID unik per device</li>
                  <li>• Auto-registrasi username Roblox</li>
                  <li>• UI input key built-in (opsional)</li>
                  <li>• Load script berbeda berdasarkan role</li>
                </ul>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-400 mb-2">Catatan HWID:</h4>
                <p className="text-sm text-muted-foreground">
                  Setiap executor memiliki metode HWID berbeda. Pastikan menggunakan metode yang sesuai
                  dengan executor yang Anda gunakan (Synapse X, Script-Ware, Fluxus, KRNL, dll).
                </p>
              </div>
              <CodeBlock code={codeBlocks.robloxScript} label="Roblox Lua Script" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ApiDocumentation;
