// Articles du blog. Règles éditoriales :
// - contenu utile et vérifiable, sans chiffre inventé ni promesse de résultat ;
// - les règles qui évoluent (DPE, fiscalité) renvoient à une vérification au moment de la vente ;
// - chaque article se termine par un appel à l'estimation (composant BlogCta).
// Dans les textes : **gras** et [lien](/chemin) sont pris en charge.

export interface BlogSection {
  h2: string;
  paragraphs?: string[];
  list?: string[];
}

/** Contenu d'un article écrit dans le tableau de bord : une suite de blocs simples */
export type ArticleBlock =
  | { type: 'h2'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'img'; url: string; alt: string; caption?: string };

export interface BlogPost {
  slug: string;
  title: string;
  /** Balise <title> (≤ 55 caractères, la marque est ajoutée si la place le permet) */
  metaTitle: string;
  /** ≤ 155 caractères, sert de meta description */
  description: string;
  category: string;
  date: string; // AAAA-MM-JJ
  updated?: string;
  readingMinutes: number;
  intro: string;
  sections: BlogSection[];
  related: string[];
  /** Articles écrits par la conseillère : blocs (sinon, `sections` ci-dessus) */
  blocks?: ArticleBlock[];
  /** Photo d'illustration en tête d'article (adresse https) */
  coverUrl?: string;
  /** « code » = articles livrés avec le site ; « db » = articles écrits dans le tableau de bord */
  source?: 'code' | 'db';
}

export function blocksOf(post: BlogPost): ArticleBlock[] {
  if (post.blocks) return post.blocks;
  const out: ArticleBlock[] = [];
  for (const s of post.sections) {
    out.push({ type: 'h2', text: s.h2 });
    for (const p of s.paragraphs || []) out.push({ type: 'p', text: p });
    if (s.list?.length) out.push({ type: 'ul', items: s.list });
  }
  return out;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'estimer-appartement-lyon-criteres-prix',
    metaTitle: "Estimer son appartement à Lyon : 8 critères de prix",
    title: 'Estimer son appartement à Lyon : les 8 critères qui font vraiment varier le prix',
    description:
      "Quartier, étage, état, DPE, charges… Les 8 critères qui font varier le prix d'un appartement à Lyon et dans l'agglomération, et comment les évaluer.",
    category: 'Estimation',
    date: '2026-10-04',
    readingMinutes: 6,
    intro:
      "Deux appartements de même surface, dans le même quartier, peuvent se vendre à des prix très différents. Ce qui les sépare tient rarement à un seul élément : c'est l'addition de détails que les acheteurs regardent de près. Voici les huit critères qui comptent le plus, et la façon de les évaluer honnêtement avant de fixer un prix.",
    sections: [
      {
        h2: '1. La localisation, à l\'échelle de la rue',
        paragraphs: [
          "À Lyon et dans l'agglomération, le prix varie d'un arrondissement à l'autre, mais aussi d'une rue à l'autre : proximité du métro ou du tram, calme de la rue, commerces, écoles, vue sur un parc ou sur une cour. Une moyenne par quartier ne dit rien de ces nuances. Pour se repérer, le plus fiable reste de regarder les [ventes réellement conclues autour de chez vous](/blog/prix-immobilier-dvf-ventes-reelles-quartier).",
        ],
      },
      {
        h2: '2. La surface utile et l\'agencement',
        paragraphs: [
          "La surface compte, mais l'usage aussi : une pièce de vie bien proportionnée, des couloirs réduits au minimum, des chambres qui reçoivent un vrai lit double. Pour un appartement en copropriété, la surface « loi Carrez » figure obligatoirement dans l'acte et fait foi. Un plan mal pensé peut faire perdre de l'intérêt à des mètres carrés pourtant généreux.",
        ],
      },
      {
        h2: '3. L\'étage, l\'ascenseur, la vue et la luminosité',
        paragraphs: [
          "Ce sont les critères que les acheteurs ressentent dès l'entrée, et qu'aucune base de données ne mesure. Un étage élevé avec ascenseur et une belle lumière se valorisent bien ; un rez-de-chaussée sur rue passante demande souvent un ajustement. Le jour de la visite, la lumière naturelle à plusieurs heures de la journée est un vrai argument.",
        ],
      },
      {
        h2: '4. L\'état général et les travaux réalisés',
        paragraphs: ['Les acheteurs chiffrent mentalement les travaux à prévoir et les retirent du prix qu\'ils sont prêts à payer. Pour les valoriser, gardez les factures :'],
        list: [
          'rénovation de la cuisine ou de la salle de bains ;',
          "mise aux normes de l'installation électrique ;",
          'changement des fenêtres, isolation, chauffage ;',
          'peintures et sols en bon état, qui rassurent sans coûter cher.',
        ],
      },
      {
        h2: '5. La performance énergétique (DPE) et les charges',
        paragraphs: [
          "Le diagnostic de performance énergétique est désormais un critère de décision à part entière, tout comme le montant des charges de copropriété. Un logement économe à chauffer rassure ; un logement très énergivore ouvre la négociation. Nous détaillons ce point dans notre article sur [le DPE et le prix de vente](/blog/dpe-prix-de-vente-logement).",
        ],
      },
      {
        h2: '6. Les extérieurs, la cave et le stationnement',
        paragraphs: [
          "Balcon, terrasse, loggia, jardin privatif : l'espace extérieur est très recherché. À Lyon, une place de parking ou un box, et une cave, comptent aussi, car le stationnement y est souvent difficile. Indiquez précisément ce qui est inclus dans la vente.",
        ],
      },
      {
        h2: '7. La copropriété : l\'immeuble compte autant que l\'appartement',
        paragraphs: [
          "Un acheteur averti examine l'état des parties communes, le sérieux de la gestion, les travaux votés ou à venir (toiture, façade, ascenseur) et le fonds de travaux. Les procès-verbaux des dernières assemblées générales en disent long : mieux vaut les avoir sous la main (voir notre liste des [documents à rassembler pour vendre](/blog/documents-vendre-appartement-maison)).",
        ],
      },
      {
        h2: '8. Le moment du marché',
        paragraphs: [
          "Taux d'emprunt, nombre d'acheteurs actifs, biens concurrents en vente : le contexte influence la rapidité de vente et la marge de négociation. Un prix doit tenir compte de ce que le marché accepte aujourd'hui, pas seulement de ce qu'un bien valait il y a deux ans.",
        ],
      },
      {
        h2: 'Comment s\'en servir ?',
        paragraphs: [
          "Faites le tour de ces huit points en notant, pour chacun, un atout ou une faiblesse objective. Cela vous donne une vision plus honnête de votre bien, et vous prépare à la discussion avec un professionnel. Pour aller plus loin, une simulation en ligne donne un premier repère, et une visite sur place permet de tenir compte de tout ce qu'elle ne voit pas.",
        ],
      },
    ],
    related: ['prix-immobilier-dvf-ventes-reelles-quartier', 'fixer-prix-annonce-vente-immobiliere', 'estimation-en-ligne-ou-agent-immobilier'],
  },
  {
    slug: 'prix-immobilier-dvf-ventes-reelles-quartier',
    metaTitle: "Ventes réelles (DVF) : comment les lire, et leurs limites",
    title: "Ventes réelles (base DVF) : ce qu'elles révèlent sur votre bien, et ce qu'elles ne disent pas",
    description:
      "La base DVF recense les ventes immobilières réelles. Ce qu'elle apporte pour estimer un bien, pourquoi elle ne suffit pas et ce que seule une visite permet de voir.",
    category: 'Marché',
    date: '2026-10-04',
    updated: '2026-10-05',
    readingMinutes: 5,
    intro:
      "Les prix des annonces sont des prix demandés, pas des prix obtenus. Pour savoir ce que les acheteurs ont réellement payé, il existe une source publique : la base « Demandes de valeurs foncières », ou DVF. Elle est précieuse, mais elle répond à une seule question : à quel prix des biens se sont vendus. Elle ne dit pas combien vaut le vôtre.",
    sections: [
      {
        h2: 'Ce que contient la base DVF',
        paragraphs: [
          "DVF est une base publique diffusée par l'État. Elle recense les ventes conclues ces dernières années, à partir des actes notariés : date, prix inscrit à l'acte, type de bien, surface, nombre de pièces, adresse. C'est la meilleure photographie des prix réellement pratiqués, bien plus fiable que les annonces.",
        ],
      },
      {
        h2: 'Ce que les chiffres ne disent pas',
        paragraphs: ['Deux biens peuvent apparaître avec la même surface, dans la même rue, et pourtant se vendre à des prix très éloignés. DVF ne renseigne pas :'],
        list: [
          "l'état réel du logement, la qualité de la rénovation ou les travaux à prévoir ;",
          "l'étage, l'ascenseur, la vue, la luminosité, le calme ;",
          "les extérieurs, la cave, le stationnement, souvent regroupés dans un même prix ;",
          "la qualité de la copropriété, ses charges et les travaux votés ;",
          "le DPE, devenu un critère de décision majeur ;",
          "les circonstances de la vente : urgence, négociation, acheteurs en concurrence.",
        ],
      },
      {
        h2: 'Un point de départ, jamais une réponse',
        paragraphs: [
          "Une moyenne de secteur mélange des biens très différents : elle situe un ordre de grandeur, pas la valeur de votre bien. Appliquer mécaniquement un prix au mètre carré mène presque toujours à se tromper, par excès comme par défaut, et c'est précisément sur les détails ci-dessus que se joue l'écart entre une vente rapide et un bien qui stagne.",
        ],
      },
      {
        h2: 'Les erreurs fréquentes quand on compare seul',
        list: [
          'comparer des biens qui ne le sont pas (étage, état, extérieur différents) ;',
          'retenir les ventes flatteuses et ignorer les autres ;',
          "oublier que les données publiées ont un délai, alors que le marché évolue ;",
          "prendre un prix de vente regroupant plusieurs lots (logement, cave, parking) pour un prix au mètre carré ;",
          "surestimer son bien par attachement, ce que les acheteurs ne partagent pas.",
        ],
      },
      {
        h2: 'Ce que fait la visite',
        paragraphs: [
          "C'est là que la valeur se précise. Sur place, on regarde ce que les chiffres ne voient pas, on choisit les ventes réellement comparables et on justifie chaque écart avec la moyenne du secteur. Vous obtenez un avis argumenté, que vous pouvez défendre face aux acheteurs. C'est le principe de notre simulateur : une fourchette fondée sur les ventes autour de votre adresse, que la visite vient affiner, gratuitement et sans engagement. Pour comprendre la différence entre les deux approches, lisez [estimation en ligne ou par un agent](/blog/estimation-en-ligne-ou-agent-immobilier).",
        ],
      },
    ],
    related: ['estimation-en-ligne-ou-agent-immobilier', 'estimer-appartement-lyon-criteres-prix', 'fixer-prix-annonce-vente-immobiliere'],
  },
  {
    slug: 'estimation-en-ligne-ou-agent-immobilier',
    metaTitle: "Estimation en ligne ou agent immobilier : la différence",
    title: 'Estimation en ligne ou par un agent immobilier : quelle différence ?',
    description:
      "Simulateur en ligne ou visite d'un agent : ce que chacun apporte, leurs limites, et comment les combiner pour obtenir le bon prix de son bien.",
    category: 'Estimation',
    date: '2026-10-04',
    readingMinutes: 5,
    intro:
      "Un simulateur donne un chiffre en deux minutes. Un agent vient voir le bien et prend le temps de l'analyser. Les deux ont leur utilité, et ils ne répondent pas à la même question. Mieux vaut savoir ce que chacun peut, et ne peut pas, vous dire.",
    sections: [
      {
        h2: 'Ce que fait bien une estimation en ligne',
        list: [
          'elle est immédiate et gratuite, sans rendez-vous ;',
          "elle s'appuie sur des données objectives, comme les ventes enregistrées autour de l'adresse ;",
          'elle donne un ordre de grandeur pour décider si le projet vaut la peine de poursuivre ;',
          'elle permet de comparer facilement plusieurs hypothèses.',
        ],
      },
      {
        h2: 'Ce qu\'elle ne peut pas voir',
        paragraphs: [
          "Un algorithme compare des mètres carrés et des adresses. Il ne voit ni la luminosité du séjour, ni la qualité d'une rénovation, ni le calme de la rue, ni l'état réel de l'immeuble. Ce sont pourtant ces éléments qui font passer un bien d'une extrémité de la fourchette à l'autre.",
        ],
      },
      {
        h2: 'Ce qu\'apporte la visite d\'un professionnel',
        list: [
          "l'analyse du bien tel qu'il est, avec ses atouts et ses points faibles ;",
          "la connaissance du secteur : quels acheteurs, quels délais, quels biens concurrents ;",
          "une argumentation du prix que vous pourrez défendre face aux acheteurs ;",
          "des conseils concrets pour présenter le bien (petits travaux, mise en valeur).",
        ],
      },
      {
        h2: 'Une vigilance utile : le conflit d\'intérêts',
        paragraphs: [
          "Une estimation gratuite est souvent aussi une démarche commerciale : un prix trop haut peut séduire pour obtenir un mandat, un prix trop bas peut faciliter une vente rapide. Demandez toujours les ventes comparables qui justifient le chiffre, et n'hésitez pas à comparer deux avis.",
        ],
      },
      {
        h2: 'Comment les combiner',
        paragraphs: [
          "Commencez par une simulation fondée sur les ventes réelles pour vous situer, puis faites confirmer cette fourchette par une visite. L'écart entre les deux, quand il existe, a toujours une explication : c'est elle qui vous apprend le plus sur la valeur de votre bien. Vous pouvez aussi vous préparer en lisant les [critères qui font varier le prix](/blog/estimer-appartement-lyon-criteres-prix).",
        ],
      },
    ],
    related: ['prix-immobilier-dvf-ventes-reelles-quartier', 'estimer-appartement-lyon-criteres-prix', 'fixer-prix-annonce-vente-immobiliere'],
  },
  {
    slug: 'documents-vendre-appartement-maison',
    metaTitle: "Vendre son bien : documents à rassembler (liste)",
    title: 'Vendre son bien : la liste des documents à rassembler',
    description:
      "Titre de propriété, diagnostics, documents de copropriété, factures de travaux : la liste des documents à préparer avant de vendre un appartement ou une maison.",
    category: 'Préparer sa vente',
    date: '2026-10-04',
    readingMinutes: 5,
    intro:
      "Une vente avance plus vite quand le dossier est prêt. Certains documents sont obligatoires, d'autres simplement rassurants pour l'acheteur. Voici la liste pour vous y retrouver. Elle varie selon le bien : en cas de doute, un professionnel ou votre notaire vous indiquera ce qui s'applique à votre situation.",
    sections: [
      {
        h2: 'Les documents liés au bien et à sa propriété',
        list: [
          'le titre de propriété (acte d\'achat) ;',
          'la dernière taxe foncière ;',
          'le plan du bien, s\'il existe ;',
          'les factures et garanties des travaux réalisés (fenêtres, électricité, toiture, cuisine…) ;',
          'les autorisations d\'urbanisme en cas de travaux ou d\'extension.',
        ],
      },
      {
        h2: 'Les diagnostics techniques',
        paragraphs: [
          "Un dossier de diagnostics est annexé à la promesse puis à l'acte de vente. Selon l'âge, la localisation et le type de bien, il comprend notamment :",
        ],
        list: [
          'le diagnostic de performance énergétique (DPE) ;',
          "l'état des risques et pollutions ;",
          "le repérage de l'amiante, pour les biens dont le permis de construire est ancien ;",
          'le constat de risque d\'exposition au plomb, pour les logements anciens ;',
          "les diagnostics de l'installation électrique et de gaz, lorsque les installations ont plus de quinze ans ;",
          "le mesurage de la surface (loi Carrez) pour un lot en copropriété ;",
          "selon la commune, un diagnostic termites ou d'assainissement.",
        ],
      },
      {
        h2: 'Les documents de copropriété',
        list: [
          'le règlement de copropriété et ses modificatifs ;',
          "les procès-verbaux des dernières assemblées générales (les trois dernières années sont généralement demandées) ;",
          "le montant des charges et les derniers appels de fonds ;",
          "le carnet d'entretien de l'immeuble ;",
          "les informations sur les travaux votés ou à venir, et sur le fonds de travaux.",
        ],
      },
      {
        h2: 'Les documents liés à votre situation',
        list: [
          "un justificatif d'identité ;",
          'le contrat de location et les dernières quittances, si le bien est loué ;',
          "les informations sur un éventuel prêt en cours (pour organiser son remboursement à la vente).",
        ],
      },
      {
        h2: 'Par où commencer ?',
        paragraphs: [
          "Si vous n'avez que quelques minutes : retrouvez le titre de propriété, la dernière taxe foncière et, en copropriété, les derniers procès-verbaux d'assemblée. Les diagnostics peuvent être commandés une fois la décision de vendre prise. Lors de la visite, votre conseiller vous précisera ceux qui concernent votre bien. Pour la suite du parcours, consultez [les étapes d'une vente immobilière](/blog/etapes-vente-immobiliere).",
        ],
      },
    ],
    related: ['etapes-vente-immobiliere', 'dpe-prix-de-vente-logement', 'estimer-appartement-lyon-criteres-prix'],
  },
  {
    slug: 'dpe-prix-de-vente-logement',
    metaTitle: "DPE et prix de vente : ce que regardent les acheteurs",
    title: 'DPE et prix de vente : ce que les acheteurs regardent',
    description:
      "Le diagnostic de performance énergétique influence la négociation et la vitesse de vente. Ce qu'il faut savoir avant de vendre, et les règles à vérifier.",
    category: 'Préparer sa vente',
    date: '2026-10-04',
    readingMinutes: 5,
    intro:
      "Le DPE classe un logement de A (très performant) à G (très énergivore). Longtemps simple formalité, il est devenu un critère central pour les acheteurs, à cause de la facture énergétique qu'il laisse entrevoir et des travaux qu'il peut imposer.",
    sections: [
      {
        h2: 'Ce que le DPE mesure',
        paragraphs: [
          "Le diagnostic estime la consommation d'énergie du logement et son impact en émissions de gaz à effet de serre, à partir de l'isolation, du mode de chauffage, de la ventilation et de la production d'eau chaude. Il est réalisé par un diagnostiqueur certifié, et sa durée de validité est de dix ans.",
        ],
      },
      {
        h2: 'Pourquoi il pèse dans la négociation',
        paragraphs: [
          "Les acheteurs comparent les logements aussi sur leur coût d'usage. Une mauvaise étiquette annonce des factures élevées et des travaux à financer : l'acheteur les intègre dans son offre, voire écarte le bien. À l'inverse, une bonne étiquette se valorise et rassure. L'effet exact dépend du secteur et du type de bien : il se constate sur les ventes, pas dans une formule.",
        ],
      },
      {
        h2: 'Des règles qui évoluent',
        paragraphs: [
          "La réglementation évolue régulièrement : calendrier d'interdiction progressive de mise en location des logements les plus énergivores, audit énergétique obligatoire à la vente pour certaines maisons et certains immeubles classés dans les étiquettes les plus basses, etc. Vérifiez toujours les règles en vigueur au moment de votre vente auprès d'un professionnel ou sur les sites officiels : elles peuvent avoir changé depuis la publication de cet article.",
        ],
      },
      {
        h2: 'Que faire avant de vendre ?',
        list: [
          "faire réaliser le diagnostic assez tôt, pour connaître votre étiquette avant d'afficher un prix ;",
          "rassembler les justificatifs des travaux d'isolation, de chauffage ou de fenêtres déjà réalisés ;",
          "comparer le coût de travaux ciblés (isolation, changement de chauffage) avec la valorisation qu'ils peuvent apporter : ce n'est pas toujours rentable, demandez un avis ;",
          "présenter le sujet franchement à l'acheteur, avec des devis si possible, plutôt que de laisser planer le doute.",
        ],
      },
      {
        h2: 'En résumé',
        paragraphs: [
          "Le DPE ne fait pas à lui seul le prix, mais il pèse dans la décision et dans la négociation. Mieux vaut le connaître tôt et en tenir compte dans votre prix. Il fait partie des [critères qui font varier la valeur d'un bien](/blog/estimer-appartement-lyon-criteres-prix) et du [dossier de diagnostics à préparer](/blog/documents-vendre-appartement-maison).",
        ],
      },
    ],
    related: ['documents-vendre-appartement-maison', 'estimer-appartement-lyon-criteres-prix', 'fixer-prix-annonce-vente-immobiliere'],
  },
  {
    slug: 'etapes-vente-immobiliere',
    metaTitle: "Étapes d'une vente immobilière : du prix à l'acte",
    title: "Les étapes d'une vente immobilière, de l'estimation à l'acte de vente",
    description:
      "Estimation, mise en vente, offre, compromis, délai de rétractation, acte chez le notaire : les grandes étapes d'une vente immobilière expliquées simplement.",
    category: 'Préparer sa vente',
    date: '2026-10-04',
    readingMinutes: 6,
    intro:
      "Vendre un bien suit un déroulé précis, avec des étapes juridiques qui protègent vendeur et acheteur. Les connaître à l'avance évite les surprises et aide à planifier son projet (achat suivant, déménagement, financement).",
    sections: [
      {
        h2: '1. L\'estimation et le choix du prix',
        paragraphs: [
          "Tout commence par une estimation sérieuse : ventes comparables, analyse du bien, contexte du marché. C'est ce prix qui détermine la rapidité de la vente. Voir aussi : [comment fixer le bon prix d'annonce](/blog/fixer-prix-annonce-vente-immobiliere).",
        ],
      },
      {
        h2: '2. La préparation du dossier',
        paragraphs: [
          "Diagnostics, titre de propriété, documents de copropriété : un dossier complet rassure les acheteurs et accélère la suite. La [liste des documents à rassembler](/blog/documents-vendre-appartement-maison) vous aide à ne rien oublier.",
        ],
      },
      {
        h2: '3. La mise en vente et les visites',
        paragraphs: [
          "Photos soignées, annonce précise, visites bien préparées : c'est la phase où le bien rencontre ses acheteurs. Un logement rangé, lumineux et entretenu se présente mieux, sans qu'il soit nécessaire d'engager de gros travaux.",
        ],
      },
      {
        h2: '4. L\'offre d\'achat',
        paragraphs: [
          "Un acheteur intéressé remet une offre, que vous pouvez accepter, refuser ou contre-proposer. Une offre acceptée donne lieu à la rédaction de l'avant-contrat.",
        ],
      },
      {
        h2: '5. L\'avant-contrat : compromis ou promesse de vente',
        paragraphs: [
          "Cet avant-contrat engage les deux parties. Il fixe le prix, le bien, le calendrier et les conditions suspensives, par exemple l'obtention du prêt par l'acheteur. Pour un acquéreur non professionnel, la loi prévoit un délai de rétractation de dix jours après la remise du document, pendant lequel il peut renoncer sans motif.",
        ],
      },
      {
        h2: '6. Le délai entre avant-contrat et acte',
        paragraphs: [
          "Pendant cette période, l'acheteur finalise son financement et le notaire vérifie les pièces, purge les droits éventuels et prépare l'acte. Ce délai dure en général quelques semaines à quelques mois, selon la complexité du dossier : comptez environ deux à trois mois, mais il varie selon les situations.",
        ],
      },
      {
        h2: '7. La signature de l\'acte authentique',
        paragraphs: [
          "La vente est conclue chez le notaire : signature de l'acte, paiement du prix, remise des clés. Le notaire s'occupe aussi des formalités, y compris le remboursement de votre éventuel prêt en cours. Côté fiscalité, la vente de la résidence principale est, sous conditions, exonérée de plus-value : vérifiez votre cas auprès de votre notaire.",
        ],
      },
    ],
    related: ['documents-vendre-appartement-maison', 'fixer-prix-annonce-vente-immobiliere', 'estimation-en-ligne-ou-agent-immobilier'],
  },
  {
    slug: 'fixer-prix-annonce-vente-immobiliere',
    metaTitle: "Prix d'annonce : les pièges d'un prix mal fixé",
    title: "Prix d'annonce : les pièges d'un prix mal fixé, et comment les éviter",
    description:
      "Un prix trop haut fait stagner l'annonce, un prix trop bas fait perdre de l'argent. Pourquoi le prix d'annonce est la décision la plus délicate d'une vente.",
    category: 'Estimation',
    date: '2026-10-04',
    updated: '2026-10-05',
    readingMinutes: 5,
    intro:
      "Le prix d'annonce est la décision la plus importante d'une vente, et la plus difficile à prendre seul. Trop haut, il écarte les acheteurs et l'annonce s'essouffle. Trop bas, il fait perdre de l'argent. Voici les pièges les plus courants, et comment s'en protéger.",
    sections: [
      {
        h2: "Pourquoi c'est si difficile à fixer soi-même",
        paragraphs: [
          "On connaît son bien depuis des années, on y a investi du temps, de l'argent et des souvenirs : cet attachement fausse presque toujours le regard. À l'inverse, un acheteur compare avec ce qu'il a vu ailleurs, et ne tient aucun compte de ce que le logement représente pour vous.",
        ],
      },
      {
        h2: "Les risques d'un prix trop élevé",
        list: [
          "l'annonce reçoit peu de visites, alors que les premières semaines sont celles où l'intérêt est le plus fort ;",
          "un bien qui reste longtemps en ligne éveille la méfiance : les acheteurs se demandent ce qui cloche ;",
          "il faut ensuite baisser le prix, avec l'image d'un bien « fatigué » ;",
          "vous perdez du temps, alors que votre projet suivant (achat, déménagement) peut dépendre de cette vente.",
        ],
      },
      {
        h2: "Les risques d'un prix trop bas",
        paragraphs: [
          "Sous-évaluer permet de vendre vite, mais au détriment de votre patrimoine. Méfiez-vous aussi d'une estimation anormalement basse qui chercherait avant tout à obtenir un mandat rapidement : demandez toujours les ventes comparables qui la justifient.",
        ],
      },
      {
        h2: 'Ce qu\'un professionnel apporte',
        list: [
          "le choix de ventes réellement comparables, pas seulement les plus proches ;",
          "la connaissance des acheteurs actifs sur votre secteur et de la concurrence du moment ;",
          "une stratégie de prix et une marge de négociation décidées avant la mise en vente ;",
          "un regard extérieur et objectif sur les atouts et les faiblesses du bien ;",
          "un suivi après les premières visites : nombre de contacts, retours des acheteurs, ajustement éventuel.",
        ],
      },
      {
        h2: 'Avant de décider d\'un prix',
        paragraphs: [
          "Faites d'abord confirmer la valeur de votre bien par une visite : c'est le meilleur moyen d'éviter les deux écueils. Commencez par une fourchette fondée sur les [ventes réelles autour de chez vous](/blog/prix-immobilier-dvf-ventes-reelles-quartier), puis affinez-la sur place. Pour la suite du projet, découvrez [les étapes d'une vente immobilière](/blog/etapes-vente-immobiliere).",
        ],
      },
    ],
    related: ['estimation-en-ligne-ou-agent-immobilier', 'estimer-appartement-lyon-criteres-prix', 'etapes-vente-immobiliere'],
  },
];

export const getPost = (slug: string, all: BlogPost[] = BLOG_POSTS): BlogPost | undefined => all.find((p) => p.slug === slug);

export const formatPostDate = (iso: string): string =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
