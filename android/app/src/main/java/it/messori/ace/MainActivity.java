package it.messori.ace;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

// Guscio di ACE. Android 15+ disegna sempre sotto le barre di sistema; la pagina web non gestisce il
// bordo alto, quindi la vista si stacca dalle barre (margini) e sotto le barre resta il rosa di ACE,
// come nella PWA installata. SystemBars di Capacitor è spento (capacitor.config.ts).
public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#C2185B"));
        View contenuto = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(contenuto, (v, finestra) -> {
            Insets b = finestra.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime());
            ViewGroup.MarginLayoutParams m = (ViewGroup.MarginLayoutParams) v.getLayoutParams();
            m.setMargins(b.left, b.top, b.right, b.bottom);
            v.setLayoutParams(m);
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
