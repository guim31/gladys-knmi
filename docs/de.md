# KNMI

Das offizielle Wetter der **Niederlande** in Gladys: Messwerte, Vorhersagen und **Warnungen des
KNMI** (Koninklijk Nederlands Meteorologisch Instituut, der niederländische Wetterdienst), gelesen
über die kostenlose API von [Weerlive.nl](https://weerlive.nl). Gedacht für Niederländer in
Frankreich, für Menschen nahe der belgisch-niederländischen Grenze und für alle mit einem Haus in
den Niederlanden.

> **Ohne Weerlive-Konto entwickelt: Rückmeldungen willkommen.** Die Integration wurde mit echten
> Antworten von Weerlive (veröffentlicht von den Projekten python-weerlive und ha-knmi) gebaut und
> getestet, nicht mit dem echten Dienst. Melde, was funktioniert und was nicht, in den
> [Issues](https://github.com/guim31/gladys-knmi/issues).

Diese Integration hat keine Verbindung zu KNMI oder Weerlive.

## Überblick

- **Ein Gerät pro Ort**: ein Gladys-Haus (sein Standort), niederländische Orte oder Koordinaten,
  höchstens fünf Orte.
- Jedes Gerät zeigt Temperatur, gefühlte Temperatur, Luftfeuchtigkeit, Luftdruck, Wind (Beaufort,
  km/h und Richtung), Sichtweite, den Niederschlag der kommenden Stunde, die Wetterlage, Sonnenaufgang
  und Sonnenuntergang sowie die **KNMI-Warnung**: ihre Farbe (Grün, Gelb, Orange, Rot), ihren Titel
  und Text und die nächste angekündigte Warnung.
- Ein **Szenen-Auslöser** _Neue KNMI-Warnung_, mit dem KNMI-Text bereit für eine Benachrichtigung.
- Ein **Dashboard-Widget** _KNMI-Vorhersage_: Live-Werte, Warnungen, Sonne und 5-Tage-Vorhersage.
- Nur lesend: Nichts lässt sich steuern.

## Voraussetzungen

- Gladys Assistant **5.2.0** oder neuer (Hausauswahl in der Konfiguration, Widgets,
  Szenen-Auslöser).
- Ein **kostenloser Weerlive-API-Schlüssel**: Fülle das Formular auf
  [weerlive.nl/delen.php](https://weerlive.nl/delen.php) mit deiner E-Mail-Adresse aus; der
  Schlüssel kommt per E-Mail. Weerlive behält den kostenlosen Schlüssel der privaten Nutzung und
  dem Hobby vor.
- Internetzugang für Gladys (die Integration ruft `weerlive.nl` auf).
- Der Installationsbildschirm fragt nach dem Zugriff auf den **Standort deiner Häuser**: Er dient
  nur dem Haus, das du in der Konfiguration wählst.

## Konfiguration

Öffne **Integrationen → KNMI → Konfiguration**.

### Weerlive-API-Schlüssel

Füge den per E-Mail erhaltenen Schlüssel ein. Er bleibt in der Konfiguration von Gladys, nie in den
Protokollen.

### Orte

- **Gladys-Haus**: das Wetter am Standort dieses Hauses verfolgen (festgelegt unter Einstellungen
  → Häuser). Die Koordinaten werden auf zwei Nachkommastellen gerundet an Weerlive gesendet, etwa
  1 km.
- **Weitere Orte**: niederländische Orte (`Amsterdam`, `'s-Hertogenbosch`) oder Koordinaten
  (`52.09,5.12`), durch Semikolons getrennt. Weerlive nimmt die nächstgelegene Station: Die
  Schaltfläche _Verbindung testen_ sagt dir, welchen Ort es gefunden hat.
- Höchstens fünf Orte, Haus inklusive.

Öffne dann den Reiter **Erkennung** und füge die gewünschten Geräte hinzu: Nur hinzugefügte Geräte
werden gelesen.

### Aktualisierung und Kontingent

Der kostenlose Schlüssel erlaubt **300 Anfragen pro Tag**, und Weerlive aktualisiert seine Daten
alle 10 Minuten. Die Integration liest jeden hinzugefügten Ort höchstens alle 10 Minuten (Feld
_Aktualisierungsintervall_) und verlangsamt sich bei mehreren Orten von selbst, damit alle zusammen
unter 240 Anfragen pro Tag bleiben: 12 Minuten mit zwei Orten, 18 mit drei, 30 mit fünf. Die letzte
Messung wird in `/data` gespeichert: Ein Neustart von Gladys verbraucht das Kontingent nicht erneut,
und die Anzeige des Widgets stellt nie eine Anfrage.

### Sprache

_Sprache der Texte_ (standardmäßig Französisch) benennt die Funktionen neuer Geräte und schreibt
Wetterlage und Daten. Die Funktionsnamen werden beim Hinzufügen eines Geräts festgelegt. Die
Warntexte des KNMI bleiben auf Niederländisch, so wie das KNMI sie schreibt.

## Geräte

Alle Funktionen sind nur lesend.

| Funktion                        | Wert                                                     |
| ------------------------------- | -------------------------------------------------------- |
| Temperatur, gefühlte Temperatur | °C                                                       |
| Luftfeuchtigkeit                | %                                                        |
| Luftdruck                       | hPa                                                      |
| Wind (Beaufort)                 | 0 bis 12                                                 |
| Windgeschwindigkeit             | km/h                                                     |
| Windrichtung                    | Grad (0 = aus Norden, 90 = aus Osten)                    |
| Sichtweite                      | km                                                       |
| Niederschlag, kommende Stunde   | vorhergesagte mm für die laufende Stunde                 |
| Wetterlage                      | sonnig, bewölkt, Schauer… in der gewählten Sprache       |
| Sonnenaufgang, Sonnenuntergang  | Ortszeit der Niederlande (wie in Frankreich und Belgien) |
| KNMI-Warnstufe                  | 0 Grün, 1 Gelb, 2 Orange, 3 Rot                          |
| KNMI-Warnung, Text              | Titel und Text des KNMI, auf Niederländisch              |
| Wetteralarm                     | 1, wenn Weerlive einen Wetteralarm für die Region meldet |
| Stufe der nächsten Warnung      | Farbe der nächsten angekündigten Warnung (0, wenn keine) |
| Nächste KNMI-Warnung ab         | ihr Beginn, oder „Keine“                                 |

## Widget

Füge das Widget **KNMI-Vorhersage** zu einem Dashboard hinzu und wähle einen Ort. Es zeigt den Ort
und die Wetterlage, drei Live-Kacheln (Temperatur, gefühlt, Wind), die 5-Tage-Vorhersage (Minimum
und Maximum, Regenwahrscheinlichkeit, Wind), die gültige und die nächste Warnung mit ihren Farben,
Sonnenaufgang und Sonnenuntergang und den niederländischen KNMI-Text, wenn eine Warnung gilt. Es
wird aus der letzten Messung gebaut: Es kostet keine Anfrage.

## Szenen-Auslöser

**Neue KNMI-Warnung** löst einmal pro neuer Warnung aus:

- _Jetzt gültig_: Eine gelbe, orange oder rote Warnung beginnt für den Ort, oder eine andere Warnung
  ersetzt sie;
- _Für später angekündigt_: Das KNMI kündigt eine später beginnende Warnung an, wenn diese Farbe
  und dieser Beginn zum ersten Mal gesehen werden.

Filter: der Ort, die Farben, wann. Variablen für die Aktionen: `place`, `level` (`yellow`,
`orange`, `red`), `level_number` (1 bis 3), `phase` (`current`, `upcoming`), `title` und `text`
(auf Niederländisch, für eine gültige Warnung), `starts_at` (ISO-Datum). Die erste Messung nach der
Installation notiert nur, was gilt, und ein Neustart löst dieselbe Warnung nie zweimal aus. Das
Ende einer Warnung ist kein Ereignis: Nutze die Funktion _KNMI-Warnstufe_ (`= 0`).

## Konfigurationsaktion

**Verbindung testen** liest den ersten Ort einmal (eine Anfrage des Kontingents) und sagt dir, ob
der Schlüssel akzeptiert wird, welchen Ort Weerlive gefunden hat, wie viele Anfragen heute noch
bleiben und in welchem Takt gelesen wird.

## Szenenbeispiele

- **Sturmwarnung**: Auslöser _Neue KNMI-Warnung_, Farben Orange und Rot, _Jetzt gültig_ → eine
  Nachricht „KNMI-Warnung {{triggerEvent.data.level}}: {{triggerEvent.data.title}}“ senden.
- **Markise einfahren**: Auslöser _Gerätezustand_ auf _Wind (Beaufort)_ deines Hauses, ≥ 6 → die
  Markise oder die Rollläden schließen.
- **Am Vorabend**: Auslöser _Neue KNMI-Warnung_, _Für später angekündigt_ → eine Benachrichtigung
  mit `starts_at`, um die Gartenmöbel hereinzuholen.

## Fehlerbehebung

- **„Weerlive hat den API-Schlüssel abgelehnt“**: Prüfe den per E-Mail erhaltenen Schlüssel, ohne
  Leerzeichen.
- **„Tageslimit von Weerlive erreicht“**: Die Messungen gehen nach Mitternacht (niederländische
  Zeit) weiter. Weniger Orte oder ein längeres Intervall helfen; auch die Schaltfläche _Testen_
  verbraucht eine Anfrage.
- **„Weerlive antwortet nicht“**: Ausfall des Dienstes oder des Internetzugangs von Gladys. Die
  Messungen gehen von selbst weiter.
- **Kein Wert an einem Gerät**: Prüfe, ob das Gerät im Reiter Erkennung hinzugefügt wurde.
- **Seltsamer Ort**: Weerlive nimmt die nächstgelegene Station; gib einen anderen Ort oder
  Koordinaten ein.
- Mehr Details: Setze `LOG_LEVEL=debug` für den Container und lies seine Protokolle.

## Grenzen

- Die Daten decken die Niederlande ab: Ein weit entfernter Ort bekommt die nächstgelegene
  niederländische Station oder nichts.
- Die Warntexte sind auf Niederländisch, so wie das KNMI sie veröffentlicht.
- Höchstens fünf Orte pro Schlüssel und bestenfalls eine Messung alle 10 Minuten.
- Laut Weerlive ist der kostenlose Schlüssel für private Nutzung und Hobby gedacht.
- Ohne Weerlive-Konto entwickelt, mit echten veröffentlichten Antworten getestet.
