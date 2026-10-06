package ru.eternity1.telegramlink;

import net.md_5.bungee.api.chat.TextComponent;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

public class ServerEventListener implements Listener {

    private final TelegramLinkPlugin plugin;

    public ServerEventListener(TelegramLinkPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent e) {
        String link = plugin.getBotLink();
        if (link != null && !link.isEmpty()) {
            Player p = e.getPlayer();
            p.sendMessage(TextComponent.fromLegacyText(
                "§aПривяжи свой аккаунт к Telegram-боту: " + link + "\n§7Напиши боту /start, затем /bind [Ник] [Пароль]."
            ));
        }
    }
}
