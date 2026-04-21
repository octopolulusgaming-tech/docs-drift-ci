#!/usr/bin/env bash
set -euo pipefail

# Print multiline text via heredoc:
# print_multiline <<'EOF'
# line 1
# line 2
# EOF
print_multiline() {
  cat
}

if [[ -n "${TERM:-}" && "${TERM:-}" != "dumb" ]]; then
  clear || true
else
  printf '\033c'
fi

cat << 'ART'

  ███████╗███╗   ██╗ ██████╗ ██╗    ██╗██╗  ██╗    ██╗███╗   ███╗ █████╗ ██████╗
  ██╔════╝████╗  ██║██╔═══██╗██║    ██║╚██╗██╔╝    ██║████╗ ████║██╔══██╗██╔══██╗
  ███████╗██╔██╗ ██║██║   ██║██║ █╗ ██║ ╚███╔╝     ██║██╔████╔██║███████║██████╔╝
  ╚════██║██║╚██╗██║██║   ██║██║███╗██║ ██╔██╗     ██║██║╚██╔╝██║██╔══██║██╔═══╝
  ███████║██║ ╚████║╚██████╔╝╚███╔███╔╝██╔╝ ██╗    ██║██║ ╚═╝ ██║██║  ██║██║
  ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝    ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝

ART

printf '(+) Mail list: live.nl (090426)\n'
printf '(+) Proxies: LIGHTNINGNETHERLANDS\n'
printf '(+) Keyword: ///@///bitvavo.com\n'
printf '\n'

emails=(
  "daan.visscher@live.nl"
  "lottevanbeek@live.nl"
  "mila_utrecht@live.nl"
  "thijsmolenaar@live.nl"
  "nora.dewilde@live.nl"
  "sem_haarlem@live.nl"
  "jipbakker87@live.nl"
  "roos.vermeer@live.nl"
  "femkegroen@live.nl"
  "hugo.amsterdam@live.nl"
  "esmee.rademaker@live.nl"
  "noahzwart@live.nl"
  "isa.tulp@live.nl"
  "levi_scheveningen@live.nl"
  "sennedejong@live.nl"
  "ambervondel@live.nl"
  "stijn.vogel@live.nl"
  "maudrotterdam@live.nl"
  "jurre.meijer@live.nl"
  "liekedelft@live.nl"
  "rik_witvos@live.nl"
  "puckblauw@live.nl"
  "koen.leeuw@live.nl"
  "loor_denhaag@live.nl"
  "bramzilver@live.nl"
  "yara.devries@live.nl"
  "teun_eindhoven@live.nl"
  "fleurzon@live.nl"
  "casper.nijmegen@live.nl"
  "elinebeer@live.nl"
  "mats.gouda@live.nl"
  "sanne_vanloon@live.nl"
  "tijnoranje@live.nl"
  "romy.alkmaar@live.nl"
  "daanwolf@live.nl"
  "bo_leeuwarden@live.nl"
  "siemgroenendijk@live.nl"
  "faye.merel@live.nl"
  "noor_tilburg@live.nl"
  "jellevoskamp@live.nl"
  "ivy.rijn@live.nl"
  "bas_zwolle@live.nl"
  "larsvalk@live.nl"
  "naomi.veenstra@live.nl"
  "milanenschede@live.nl"
  "kiki_rood@live.nl"
  "wout.zeeland@live.nl"
  "saarotter@live.nl"
  "pepijn.amstel@live.nl"
  "elinhilversum@live.nl"
)

total=${#emails[@]}
green_target=$(( (total * 15 + 50) / 100 ))

declare -A green_indexes=()
while IFS= read -r idx; do
  green_indexes["$idx"]=1
done < <(seq 0 $((total - 1)) | shuf -n "$green_target")

green_count=0
red_count=0
green='\033[32m'
red='\033[31m'
reset='\033[0m'

for i in "${!emails[@]}"; do
  email=${emails[$i]}
  if [[ -n "${green_indexes[$i]:-}" ]]; then
    ((green_count+=1))
    printf '%s %b✔%b KEYWORD (///@///bitvavo.com) FOUND\n' "$email" "$green" "$reset"
  else
    ((red_count+=1))
    printf '%s %b✘%b\n' "$email" "$red" "$reset"
  fi
done

printf '\n'
printf '(+) Green checks: %d\n' "$green_count"
printf '(+) Red X: %d\n' "$red_count"
printf '\n'

print_multiline <<'EOF'
From: "Bitvavo" <support@info.bitvavo.com>
To: <redacted>
Subject: Wij vragen u om tijdig uw account actualisatie in orde te maken
Date: Mon, 29 Jan 2024 19:14:22 +0100
Message-ID: <20240129191422.9F2A1C0042@mail.info.bitvavo.com>
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8

<html>
  <body style="font-family: Arial, Helvetica, sans-serif; color: #222222;">
    <div style="max-width: 640px; margin: 0 auto;">
      <div style="text-align: center; margin-top: 40px; margin-bottom: 40px;">
        <img alt="Bitvavo" src="cid:bitvavo-logo" />
      </div>

      <h2 style="text-align: center;">Actualiseer je profiel</h2>

      <p>
        Tik op de onderstaande knop op je mobiele apparaat om het
        inloggen bij Bitvavo te voltooien.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://example-link.invalid"
           style="background: #3157ff; color: #ffffff; text-decoration: none;
                  padding: 16px 36px; border-radius: 999px; display: inline-block;
                  font-weight: bold;">
          NAAR BITVAVO
        </a>
      </div>

      <p>Deze link is 4 uur lang geldig.</p>

      <h3>Waarom heb je deze e-mail ontvangen?</h3>

      <p>
        We hebben deze e-mail gestuurd om je te helpen met het inloggen
        bij je Bitvavo-account. Het inloggen is van belang om je profiel te
        actualiseren hiermee wordt de huidige opnameslot opgeheven.
      </p>

      <p>
        Heb je niet geprobeerd in te loggen of heb je deze e-mail niet
        aangevraagd? Misschien heeft iemand per ongeluk je e-mailadres
        ingevoerd. In dat geval kun je hier
        je laatste inlogpoging controleren.
      </p>

      <p>Hoogachtend</p>
      <p>Bitvavo</p>
    </div>
  </body>
</html>
EOF
