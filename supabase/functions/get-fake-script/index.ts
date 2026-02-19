import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Generate convincing fake Lua source code
function generateFakeScript(): string {
  const fakeScripts = [
    `-- Arexans Tools v4.2.1
-- Loading modules...

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local function Initialize()
    print("[Arexans] Initializing core modules...")
    wait(1)
    print("[Arexans] Loading UI framework...")
    wait(0.5)
    print("[Arexans] Connecting to server...")
    wait(1.5)
    print("[Arexans] Authenticating session...")
    wait(2)
    
    -- Session verification
    local sessionToken = HttpService:GenerateGUID(false)
    local verified = false
    
    for i = 1, 3 do
        print("[Arexans] Verification attempt " .. i .. "/3...")
        wait(1)
    end
    
    if not verified then
        warn("[Arexans] ERROR: Session verification failed")
        warn("[Arexans] Please check your connection and try again")
        warn("[Arexans] Error Code: AX-" .. math.random(1000, 9999))
        return false
    end
    
    return true
end

local success = Initialize()
if not success then
    print("[Arexans] Script terminated due to verification failure")
    return
end`,

    `-- Arexans Premium Loader
-- Build: ${Date.now()}

local Modules = {}
local Config = {
    version = "4.2.1",
    build = "${new Date().toISOString().slice(0, 10)}",
    debug = false
}

print("[Loader] Starting Arexans Tools " .. Config.version)
print("[Loader] Build date: " .. Config.build)

-- Module loader
local function loadModule(name, url)
    print("[Loader] Loading module: " .. name)
    wait(math.random() * 2 + 0.5)
    
    local success, result = pcall(function()
        return game:HttpGet(url)
    end)
    
    if success then
        print("[Loader] Module " .. name .. " loaded successfully")
        return result
    else
        warn("[Loader] Failed to load " .. name .. ": " .. tostring(result))
        return nil
    end
end

-- Initialize modules
local modules = {
    {"CoreUI", "https://raw.githubusercontent.com/arexans/modules/main/core.lua"},
    {"PlayerManager", "https://raw.githubusercontent.com/arexans/modules/main/player.lua"},
    {"ScriptEngine", "https://raw.githubusercontent.com/arexans/modules/main/engine.lua"},
    {"NetworkLayer", "https://raw.githubusercontent.com/arexans/modules/main/network.lua"}
}

for _, mod in ipairs(modules) do
    local result = loadModule(mod[1], mod[2])
    if not result then
        warn("[Loader] Critical module failed. Aborting.")
        return
    end
    wait(0.3)
end

print("[Loader] All modules loaded. Starting main loop...")
wait(2)
warn("[Loader] ERROR: Runtime exception at main loop")
warn("[Loader] Stack trace: attempt to index nil with 'Connect'")
print("[Loader] Script terminated with error code: AX-RUNTIME-" .. math.random(100, 999))`,

    `-- Protected Script Container
-- Arexans Security Layer v3

local Security = {}
Security.__index = Security

function Security.new()
    local self = setmetatable({}, Security)
    self.token = nil
    self.validated = false
    self.attempts = 0
    return self
end

function Security:validate()
    self.attempts = self.attempts + 1
    print("[Security] Validating license... (attempt " .. self.attempts .. ")")
    wait(1.5)
    
    if self.attempts > 2 then
        warn("[Security] Too many validation attempts")
        warn("[Security] Your access has been temporarily suspended")
        warn("[Security] Please contact support: discord.gg/arexans")
        return false
    end
    
    print("[Security] Contacting license server...")
    wait(2)
    print("[Security] Decrypting response...")
    wait(1)
    
    warn("[Security] License validation failed")
    warn("[Security] Error: INVALID_HWID - Hardware ID mismatch")
    warn("[Security] Expected: " .. game:GetService("HttpService"):GenerateGUID(false))
    return false
end

local sec = Security.new()
if not sec:validate() then
    print("[Arexans] Access denied. Exiting...")
    return
end`
  ];

  return fakeScripts[Math.floor(Math.random() * fakeScripts.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const fakeScript = generateFakeScript();

    return new Response(fakeScript, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(`-- Error: ${errorMessage}`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
});
