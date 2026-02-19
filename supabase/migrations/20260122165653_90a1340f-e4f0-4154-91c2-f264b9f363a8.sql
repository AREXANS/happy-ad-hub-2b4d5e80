-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create lua_scripts table for storing Lua scripts
CREATE TABLE public.lua_scripts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    display_name text NOT NULL,
    description text,
    content text NOT NULL DEFAULT '',
    script_type text NOT NULL DEFAULT 'loader',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lua_scripts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can manage lua_scripts"
ON public.lua_scripts
FOR ALL
USING (true);

CREATE POLICY "Anyone can read active lua_scripts"
ON public.lua_scripts
FOR SELECT
USING (is_active = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lua_scripts_updated_at
BEFORE UPDATE ON public.lua_scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default scripts
INSERT INTO public.lua_scripts (name, display_name, description, content, script_type) VALUES
('keysystem', 'Key System Loader', 'Script loader untuk key system validation dengan HWID dan freeze support', '-- ====================================================================
-- == AREXANS TOOLS - KEY SYSTEM LOADER                              ==
-- ====================================================================

local HttpService = game:GetService("HttpService")
local CoreGui = game:GetService("CoreGui")
local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")

-- API Configuration (akan diupdate otomatis)
local API_URL = "https://octceotolcghpyqctgwj.supabase.co/functions/v1/validate-key"
local MAIN_SCRIPT_URL = "https://octceotolcghpyqctgwj.supabase.co/functions/v1/get-script?name=main"

-- Generate HWID
local function generateHWID()
    local hwid = ""
    local userId = tostring(LocalPlayer.UserId)
    if gethwid then
        pcall(function() hwid = gethwid() end)
    elseif get_hwid then
        pcall(function() hwid = get_hwid() end)
    elseif syn and syn.hwid then
        pcall(function() hwid = syn.hwid() end)
    elseif getexecutorname then
        pcall(function() hwid = "RBLX-" .. userId .. "-" .. getexecutorname() end)
    else
        hwid = "RBLX-" .. userId
    end
    return hwid
end

-- Validate key with API
local function validateKey(key, hwid, username)
    if request or syn or http_request then
        local reqFunc = request or (syn and syn.request) or http_request
        local success, result = pcall(function()
            return reqFunc({
                Url = API_URL,
                Method = "POST",
                Headers = {
                    ["Content-Type"] = "application/json"
                },
                Body = HttpService:JSONEncode({
                    key = key,
                    hwid = hwid,
                    robloxUsername = username
                })
            })
        end)
        if success and result then
            local bodySuccess, bodyData = pcall(function()
                return HttpService:JSONDecode(result.Body)
            end)
            if bodySuccess and bodyData then
                return bodyData
            end
        end
    end
    return {success = false, error = "Request failed"}
end

-- Load main script
local function loadMainScript()
    if request or syn or http_request then
        local reqFunc = request or (syn and syn.request) or http_request
        local success, result = pcall(function()
            return reqFunc({
                Url = MAIN_SCRIPT_URL,
                Method = "GET"
            })
        end)
        if success and result and result.Body then
            local scriptSuccess, scriptError = pcall(function()
                loadstring(result.Body)()
            end)
            if not scriptSuccess then
                warn("Failed to load main script: " .. tostring(scriptError))
            end
        end
    end
end

print("Key System Loaded - Enter your key to continue")
', 'loader'),
('main', 'Main Script', 'Script utama yang akan dijalankan setelah key valid', '-- ====================================================================
-- == AREXANS TOOLS - MAIN SCRIPT                                    ==
-- ====================================================================

print("Main Script Loaded Successfully!")
print("Welcome to Arexans Tools!")

-- Add your main script code below this line

', 'main');