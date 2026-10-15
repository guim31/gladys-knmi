# KNMI

La météo officielle des **Pays-Bas** dans Gladys : les relevés, les prévisions et les
**avertissements du KNMI** (Koninklijk Nederlands Meteorologisch Instituut, l’institut
météorologique néerlandais), lus par l’API gratuite [Weerlive.nl](https://weerlive.nl). Pensée
pour les Néerlandais de France, les frontaliers belges et tous ceux qui ont une maison aux
Pays-Bas.

> **Développée sans compte Weerlive : vos retours sont les bienvenus.** L’intégration est construite
> et testée sur de vraies réponses de Weerlive (publiées par les projets python-weerlive et
> ha-knmi), pas sur le service réel. Dites ce qui marche et ce qui ne marche pas dans les
> [issues](https://github.com/guim31/gladys-knmi/issues).

Cette intégration est sans lien avec le KNMI et avec Weerlive.

## Présentation

- **Un appareil par lieu** : une maison Gladys (sa position), des villes néerlandaises ou des
  coordonnées, cinq lieux au plus.
- Chaque appareil donne la température, la température ressentie, l’humidité, la pression, le vent
  (Beaufort, km/h et direction), la visibilité, les précipitations prévues pour l’heure à venir, les
  conditions, le lever et le coucher du soleil, et l’**avertissement du KNMI** : sa couleur (vert,
  jaune, orange, rouge), son titre et son texte, et le prochain avertissement annoncé.
- Un **déclencheur de scène** _Nouvel avertissement KNMI_, avec le texte du KNMI prêt pour une
  notification.
- Un **widget** _Prévisions KNMI_ : valeurs en direct, avertissements, soleil et prévisions à
  5 jours.
- Lecture seule : rien n’est pilotable.

## Prérequis

- Gladys Assistant **5.2.0** ou plus récent (choix de la maison dans la configuration, widgets,
  déclencheurs de scène).
- Une **clé d’API Weerlive gratuite** : remplissez le formulaire de
  [weerlive.nl/delen.php](https://weerlive.nl/delen.php) avec votre adresse e-mail ; la clé arrive
  par e-mail. Weerlive réserve la clé gratuite à un usage personnel et de loisir.
- Un accès à Internet pour Gladys (l’intégration appelle `weerlive.nl`).
- L’écran d’installation demande l’accès à la **position de vos maisons** : elle ne sert qu’à la
  maison choisie dans la configuration.

## Configuration

Ouvrez **Intégrations → KNMI → Configuration**.

### Clé d’API Weerlive

Collez la clé reçue par e-mail. Elle est gardée dans la configuration de Gladys, jamais dans les
journaux.

### Lieux

- **Maison Gladys** : suivre la météo à la position de cette maison (réglée dans Paramètres →
  Maisons). Les coordonnées sont envoyées à Weerlive arrondies à deux décimales, environ 1 km.
- **Autres lieux** : des villes néerlandaises (`Amsterdam`, `'s-Hertogenbosch`) ou des coordonnées
  (`52.09,5.12`), séparées par des points-virgules. Weerlive prend la station la plus proche : le
  bouton _Tester la connexion_ indique le lieu trouvé.
- Cinq lieux au plus, maison comprise.

Ouvrez ensuite l’onglet **Découverte** et ajoutez les appareils voulus : seuls les appareils ajoutés
sont lus.

### Rafraîchissement et quota

La clé gratuite permet **300 requêtes par jour**, et Weerlive rafraîchit ses données toutes les
10 minutes. L’intégration lit chaque lieu ajouté toutes les 10 minutes au plus (champ _Intervalle
de rafraîchissement_), et ralentit d’elle-même avec plusieurs lieux pour rester sous
240 requêtes par jour en tout : 12 minutes avec deux lieux, 18 avec trois, 30 avec cinq. La
dernière lecture est gardée dans `/data` : un redémarrage de Gladys ne dépense pas le quota une
seconde fois, et l’affichage du widget ne fait jamais de requête.

### Langue

_Langue des textes_ (français par défaut) nomme les fonctionnalités des nouveaux appareils et écrit
les conditions et les dates. Les noms des fonctionnalités sont figés à l’ajout de l’appareil. Les
textes d’avertissement du KNMI restent en néerlandais, tels que le KNMI les écrit.

## Appareils

Toutes les fonctionnalités sont en lecture seule.

| Fonctionnalité                     | Valeur                                                          |
| ---------------------------------- | --------------------------------------------------------------- |
| Température, température ressentie | °C                                                              |
| Humidité                           | %                                                               |
| Pression atmosphérique             | hPa                                                             |
| Vent (Beaufort)                    | 0 à 12                                                          |
| Vitesse du vent                    | km/h                                                            |
| Direction du vent                  | degrés (0 = du nord, 90 = de l’est)                             |
| Visibilité                         | km                                                              |
| Précipitations, heure à venir      | mm prévus pour l’heure en cours                                 |
| Conditions                         | ensoleillé, nuageux, averses… dans la langue choisie            |
| Lever et coucher du soleil         | heure locale des Pays-Bas (la même qu’en France et en Belgique) |
| Niveau d’avertissement KNMI        | 0 vert, 1 jaune, 2 orange, 3 rouge                              |
| Avertissement KNMI, texte          | titre et texte du KNMI, en néerlandais                          |
| Alarme météo                       | 1 quand Weerlive signale une alarme météo pour la région        |
| Niveau du prochain avertissement   | couleur du prochain avertissement annoncé (0 s’il n’y en a pas) |
| Prochain avertissement à partir de | son début, ou « Aucun »                                         |

## Widget

Ajoutez le widget **Prévisions KNMI** à un tableau de bord et choisissez un lieu. Il montre le lieu
et les conditions, trois tuiles en direct (température, ressenti, vent), les prévisions à 5 jours
(minimum et maximum, risque de pluie, vent), l’avertissement en cours et le suivant avec leurs
couleurs, le lever et le coucher du soleil, et le texte néerlandais du KNMI quand un avertissement
est en vigueur. Il est construit à partir de la dernière lecture : il ne coûte aucune requête.

## Déclencheur de scène

**Nouvel avertissement KNMI** se déclenche une fois par nouvel avertissement :

- _En vigueur_ : un avertissement jaune, orange ou rouge commence pour le lieu, ou un autre
  avertissement le remplace ;
- _Annoncé pour plus tard_ : le KNMI annonce un avertissement qui commence plus tard, la première
  fois que cette couleur et ce début sont vus.

Filtres : le lieu, les couleurs, le moment. Variables pour les actions : `place`, `level`
(`yellow`, `orange`, `red`), `level_number` (1 à 3), `phase` (`current`, `upcoming`), `title` et
`text` (en néerlandais, pour un avertissement en vigueur), `starts_at` (date ISO). La première
lecture après l’installation ne fait que noter ce qui est en vigueur, et un redémarrage ne
redéclenche jamais le même avertissement. La fin d’un avertissement n’est pas un événement :
utilisez la fonctionnalité _Niveau d’avertissement KNMI_ (`= 0`).

## Action de configuration

**Tester la connexion** lit le premier lieu une fois (une requête du quota) et indique si la clé est
acceptée, quel lieu Weerlive a trouvé, combien de requêtes restent aujourd’hui et le rythme des
lectures.

## Exemples de scènes

- **Alerte tempête** : déclencheur _Nouvel avertissement KNMI_, couleurs orange et rouge, _En
  vigueur_ → envoyer un message « Avertissement KNMI {{triggerEvent.data.level}} :
  {{triggerEvent.data.title}} ».
- **Rentrer le store** : déclencheur _Changement d’état d’un appareil_ sur _Vent (Beaufort)_ de
  votre maison, ≥ 6 → fermer le store ou les volets.
- **La veille** : déclencheur _Nouvel avertissement KNMI_, _Annoncé pour plus tard_ → une
  notification avec `starts_at`, pour rentrer le salon de jardin.

## Dépannage

- **« Weerlive a refusé la clé d’API »** : vérifiez la clé reçue par e-mail, sans espace.
- **« Limite quotidienne Weerlive atteinte »** : les relevés reprennent après minuit, heure
  néerlandaise. Moins de lieux ou un intervalle plus long aident ; le bouton _Tester_ dépense aussi
  une requête.
- **« Weerlive ne répond pas »** : panne du service ou de l’accès à Internet de Gladys. Les relevés
  reprennent d’eux-mêmes.
- **Aucune valeur sur un appareil** : vérifiez que l’appareil a été ajouté dans l’onglet Découverte.
- **Lieu étrange** : Weerlive prend la station la plus proche ; saisissez une autre ville ou des
  coordonnées.
- Plus de détails : réglez `LOG_LEVEL=debug` sur le conteneur et lisez ses journaux.

## Limites

- Les données couvrent les Pays-Bas : un lieu éloigné reçoit la station néerlandaise la plus proche,
  ou rien.
- Les textes d’avertissement sont en néerlandais, tels que le KNMI les publie.
- Cinq lieux au plus par clé, et une lecture toutes les 10 minutes au mieux.
- Weerlive indique que sa clé gratuite est réservée à un usage personnel et de loisir.
- Développée sans compte Weerlive, testée sur de vraies réponses publiées.
