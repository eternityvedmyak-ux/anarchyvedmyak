package ru.eternity1.telegramlink;

import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.plugin.java.JavaPlugin;

public class TelegramLinkPlugin extends JavaPlugin {

    private static TelegramLinkPlugin instance;
    private String botLink;

    @Override
    public void onEnable() {
        instance = this;
        saveDefaultConfig();
        reloadCfg();
        getServer().getPluginManager().registerEvents(new ServerEventListener(this), this);
        getLogger().info("TelegramLink включён. bot_link=" + (botLink.isEmpty() ? "(не задан)" : botLink));
    }

    public void reloadCfg() {
        FileConfiguration cfg = getConfig();
        this.botLink = (cfg.getString("bot_link", "") == null ? "" : cfg.getString("bot_link", "")).trim();
    }

    public static TelegramLinkPlugin getInstance() {
        return instance;
    }

    public String getBotLink() {
        return botLink;
    }
}
