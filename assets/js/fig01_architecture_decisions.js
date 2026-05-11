/* ──────────────────────────────────────────────────────────
 * Figure 1 — The Architecture, in Decisions.
 *
 * Horizontal narrative ribbon, 1934 → 2024.
 *   • Build policies (filled, domain-colored dots) above the
 *     ribbon. Each label is STACKED VERTICALLY and CENTERED
 *     on its dot — year on top, policy name below. This
 *     replaces the previous right-running labels, which
 *     collided horizontally whenever two policies sat near
 *     the same year (1965, 1974, 1996 clusters).
 *   • Dismantle policies (hollow rust dots) below the ribbon,
 *     mirrored: year above the name, both below the dot.
 *   • Pivot at 1978 is a full-height dashed line drawn behind
 *     everything, with its label sitting alone at the top of
 *     the chart.
 *
 * Layout math (viewBox 1800 × 620):
 *   BASE_STEM = 70 px guarantees the lowest-row dot clears
 *   the ribbon. ROW_GAP = 50 px gives each stacked label
 *   pair its own band of clear space.
 *
 * Row assignment: sort by year, then for each policy place
 * it on the lowest row whose used spans don't overlap this
 * label's centered bounding box (real measured width). Back-
 * fills onto lower rows when a short label can fit beside
 * an earlier long one.
 *
 * Interaction:
 *   • Hover any marker → tooltip with year / full name /
 *     domain · direction / effect sentence.
 * ────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (typeof d3 === 'undefined') return;

  // ── DATA ───────────────────────────────────────────
  var POLICIES = [
    {year:1934, name:"National Housing Act / FHA created",
     domain:"housing", direction:"build",
     effect:"Federally insured mortgages drive homeownership from 44% to 62% by 1960."},
    {year:1935, name:"Social Security Act",
     domain:"retirement", direction:"build",
     effect:"Establishes federal retirement income floor for older Americans."},
    {year:1944, name:"Servicemen's Readjustment Act (GI Bill)",
     domain:"education", direction:"build",
     effect:"8 million veterans receive college tuition and home loan benefits."},
    {year:1949, name:"Housing Act of 1949",
     domain:"housing", direction:"build",
     effect:"Authorizes large-scale public housing construction."},
    {year:1956, name:"Federal-Aid Highway Act",
     domain:"housing", direction:"build",
     effect:"$25B in interstate construction subsidizes suburban homeownership."},
    {year:1965, name:"Medicare and Medicaid Act",
     domain:"healthcare", direction:"build",
     effect:"Federal health insurance for seniors and low-income households."},
    {year:1965, name:"Higher Education Act",
     domain:"education", direction:"build",
     effect:"Establishes federal student aid; precursor to Pell Grants."},
    {year:1974, name:"Equal Credit Opportunity Act",
     domain:"financial", direction:"build",
     effect:"Prohibits discrimination in credit; expands mortgage access for women and minorities."},
    {year:1974, name:"Employee Retirement Income Security Act (ERISA)",
     domain:"retirement", direction:"build",
     effect:"Protects private pension benefits; creates federal oversight."},
    {year:1977, name:"Community Reinvestment Act",
     domain:"housing", direction:"build",
     effect:"Requires banks to lend in low-income neighborhoods they serve."},
    {year:1978, name:"Revenue Act / Section 401(k) enacted",
     domain:"retirement", direction:"dismantle",
     effect:"Tax-deferred individual accounts begin replacing defined-benefit pensions."},
    {year:1981, name:"Economic Recovery Tax Act",
     domain:"tax", direction:"dismantle",
     effect:"Top marginal rate cut from 70% to 50%. Capital gains tax cut to 20%."},
    {year:1986, name:"Tax Reform Act of 1986",
     domain:"tax", direction:"dismantle",
     effect:"Lowers top rates further; eliminates many middle-class deductions."},
    {year:1996, name:"Personal Responsibility and Work Opportunity Act",
     domain:"labor", direction:"dismantle",
     effect:"Replaces AFDC with TANF; imposes five-year lifetime limit on assistance."},
    {year:1996, name:"Telecommunications Act",
     domain:"financial", direction:"dismantle",
     effect:"Deregulates industry; precedent for broader consolidation policy."},
    {year:1999, name:"Gramm-Leach-Bliley Act (Glass-Steagall repeal)",
     domain:"financial", direction:"dismantle",
     effect:"Allows commercial banks to merge with investment banks; expands asset speculation."},
    {year:2003, name:"Jobs and Growth Tax Relief Reconciliation Act",
     domain:"tax", direction:"dismantle",
     effect:"Cuts capital gains and dividend tax to 15%. Labor income taxed at higher rate."},
    {year:2010, name:"Affordable Care Act",
     domain:"healthcare", direction:"build",
     effect:"Expands health insurance; first significant building action in three decades."},
    {year:2017, name:"Tax Cuts and Jobs Act",
     domain:"tax", direction:"dismantle",
     effect:"Corporate rate cut from 35% to 21%. Capital gains preferences preserved."},
    {year:2020, name:"CARES Act and Federal Reserve asset purchases",
     domain:"financial", direction:"dismantle",
     effect:"$3 trillion in asset price support; asset holders gain disproportionately."}
  ];

  // Darker palette tuned for the cream light-theme backdrop.
  // The originals were calibrated for #0a0807; on #ebe3d1
  // they wash out.
  var DOMAINS = [
    {key:"housing",    label:"Housing",    color:"#a08840"},
    {key:"retirement", label:"Retirement", color:"#6e8556"},
    {key:"tax",        label:"Taxation",   color:"#8a3018"},
    {key:"healthcare", label:"Healthcare", color:"#456a85"},
    {key:"education",  label:"Education",  color:"#7a6094"},
    {key:"labor",      label:"Labor",      color:"#6a6258"},
    {key:"financial",  label:"Financial",  color:"#444444"}
  ];

  // Short labels — full names are too long for centered stacking.
  // The tooltip carries the full title.
  var SHORT_NAMES = {
    "National Housing Act / FHA created":      "FHA created",
    "Social Security Act":                     "Social Security",
    "Servicemen's Readjustment Act (GI Bill)": "GI Bill",
    "Housing Act of 1949":                     "Housing Act",
    "Federal-Aid Highway Act":                 "Interstate Highways",
    "Medicare and Medicaid Act":               "Medicare / Medicaid",
    "Higher Education Act":                    "Higher Education Act",
    "Equal Credit Opportunity Act":            "Equal Credit Opportunity",
    "Employee Retirement Income Security Act (ERISA)": "ERISA",
    "Community Reinvestment Act":              "Community Reinvestment",
    "Revenue Act / Section 401(k) enacted":    "401(k) enacted",
    "Economic Recovery Tax Act":               "Reagan tax cuts",
    "Tax Reform Act of 1986":                  "Tax Reform Act",
    "Personal Responsibility and Work Opportunity Act": "Welfare reform (TANF)",
    "Telecommunications Act":                  "Telecom deregulation",
    "Gramm-Leach-Bliley Act (Glass-Steagall repeal)": "Glass-Steagall repeal",
    "Jobs and Growth Tax Relief Reconciliation Act": "Bush dividend tax cut",
    "Affordable Care Act":                     "Affordable Care Act",
    "Tax Cuts and Jobs Act":                   "TCJA corporate cut",
    "CARES Act and Federal Reserve asset purchases": "CARES Act / Fed QE"
  };

  function init() {
    var svgSel = d3.select('#architecture-svg');
    if (svgSel.empty()) return;
    if (svgSel.attr('data-init') === '1') return;
    svgSel.attr('data-init', '1');

    // ── LAYOUT CONSTANTS (viewBox 1800 × 660) ──────
    // The ribbon sits low enough to give build labels three
    // comfortable rows above; the dismantle zone runs deep
    // enough below to accommodate four rows for the 1996/
    // 1999/2003 cluster without crashing the period label.
    var V = {w: 1800, h: 660};
    var X_PAD_LEFT  = 60;
    var X_PAD_RIGHT = 60;
    var PIVOT_LABEL_TOP    = 16;
    var RIBBON_TOP    = 290;
    var RIBBON_BOTTOM = 340;
    var PERIOD_LABEL_Y = 645;

    // Row geometry.
    //   BASE_STEM = 70: the lowest-row dot sits 70px from the
    //                   ribbon edge, never touching it.
    //   ROW_GAP   = 50: each row pulls its dot another 50px
    //                   away from the ribbon, giving the
    //                   stacked label pair 36px of header
    //                   space (year 14px + name 12px + gap).
    var BASE_STEM      = 70;
    var ROW_GAP        = 50;
    var LABEL_PAD      = 18;   // horizontal breathing room between
                                // centered label boxes on the same row
    var DOT_RADIUS     = 11;
    var DOT_LABEL_GAP  = 18;   // dot edge → nearest label baseline
    var YEAR_NAME_GAP  = 14;   // baseline-to-baseline between year & name

    var x = d3.scaleLinear()
      .domain([1932, 2026])
      .range([X_PAD_LEFT, V.w - X_PAD_RIGHT]);
    var pivotX = x(1978);

    // ── 1. PIVOT LINE (drawn FIRST so it sits behind everything) ──
    svgSel.append('line')
      .attr('class', 'pivot-line')
      .attr('x1', pivotX).attr('x2', pivotX)
      .attr('y1', 10).attr('y2', V.h - 10)
      .attr('stroke', '#8a3018')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '8,5')
      .attr('opacity', 0.7);

    // ── 2. PIVOT LABEL (top of chart, in its own clear zone) ──
    svgSel.append('text')
      .attr('x', pivotX).attr('y', PIVOT_LABEL_TOP + 14)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Inter, sans-serif')
      .style('font-size', '14px')
      .style('font-weight', '700')
      .style('letter-spacing', '0.32em')
      .style('text-transform', 'uppercase')
      .style('fill', '#a04020')
      .text('The pivot');
    svgSel.append('text')
      .attr('x', pivotX).attr('y', PIVOT_LABEL_TOP + 38)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Georgia, serif')
      .style('font-style', 'italic')
      .style('font-size', '16px')
      .style('fill', '#c9a96e')
      .text('1978 · 401(k) enacted');

    // ── 3. RIBBON ─────────────────────────────────
    svgSel.append('rect')
      .attr('x', x(1934)).attr('y', RIBBON_TOP)
      .attr('width', pivotX - x(1934))
      .attr('height', RIBBON_BOTTOM - RIBBON_TOP)
      .attr('fill', 'rgba(45,106,79,0.32)');
    svgSel.append('rect')
      .attr('x', pivotX).attr('y', RIBBON_TOP)
      .attr('width', x(2024) - pivotX)
      .attr('height', RIBBON_BOTTOM - RIBBON_TOP)
      .attr('fill', 'rgba(160,64,32,0.28)');
    svgSel.append('rect')
      .attr('x', x(1934)).attr('y', RIBBON_TOP)
      .attr('width', x(2024) - x(1934))
      .attr('height', RIBBON_BOTTOM - RIBBON_TOP)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(201,169,110,0.3)')
      .attr('stroke-width', 1);

    svgSel.append('text')
      .attr('x', (x(1934) + pivotX) / 2).attr('y', PERIOD_LABEL_Y)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Inter, sans-serif')
      .style('font-size', '14px')
      .style('font-weight', '700')
      .style('letter-spacing', '0.4em')
      .style('text-transform', 'uppercase')
      .style('fill', '#1e5a3f')
      .text('Building period');
    svgSel.append('text')
      .attr('x', (pivotX + x(2024)) / 2).attr('y', PERIOD_LABEL_Y)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Inter, sans-serif')
      .style('font-size', '14px')
      .style('font-weight', '700')
      .style('letter-spacing', '0.4em')
      .style('text-transform', 'uppercase')
      .style('fill', '#8a3018')
      .text('Dismantling period');

    // ── 4. WIDTH-AWARE LABEL STACKING ──────────────
    // Measure each policy's centered label box (max of year
    // width vs. policy-name width — name almost always wins),
    // then assign each policy to the lowest row whose used
    // spans don't overlap the new box.
    var temp = svgSel.append('g').style('visibility', 'hidden');

    function measureText(str, fontSize, fontWeight) {
      var t = temp.append('text')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', fontSize)
        .style('font-weight', fontWeight)
        .text(str);
      var w = t.node().getBBox().width;
      t.remove();
      return w;
    }

    function buildMeta(policies) {
      return policies.slice()
        .sort(function (a, b) { return a.year - b.year; })
        .map(function (p) {
          var shortName = SHORT_NAMES[p.name] || p.name;
          var yearW = measureText(String(p.year), '14px', '700');
          var nameW = measureText(shortName, '12px', '400');
          return {
            policy: p,
            shortName: shortName,
            // Label box width = whichever line is wider.
            labelWidth: Math.max(yearW, nameW),
            x: x(p.year),
            row: null
          };
        });
    }

    // Full-row collision detection: each row holds a list of
    // [leftEdge, rightEdge] spans, and a new policy is placed
    // on the lowest row where it doesn't overlap any span. This
    // back-fills correctly when a short label can squeeze into
    // a gap left by an earlier, longer one.
    function assignRows(meta) {
      var rows = [];  // rows[r] = array of {leftEdge, rightEdge}
      meta.forEach(function (m) {
        var halfW = m.labelWidth / 2;
        var leftEdge  = m.x - halfW - LABEL_PAD / 2;
        var rightEdge = m.x + halfW + LABEL_PAD / 2;

        var assigned = -1;
        for (var r = 0; r < rows.length; r++) {
          var overlaps = rows[r].some(function (span) {
            return !(span.rightEdge < leftEdge || span.leftEdge > rightEdge);
          });
          if (!overlaps) {
            rows[r].push({leftEdge: leftEdge, rightEdge: rightEdge});
            assigned = r;
            break;
          }
        }
        if (assigned === -1) {
          rows.push([{leftEdge: leftEdge, rightEdge: rightEdge}]);
          assigned = rows.length - 1;
        }
        m.row = assigned;
        m.stem = BASE_STEM + m.row * ROW_GAP;
      });
    }

    var buildPolicies     = POLICIES.filter(function (p) { return p.direction === 'build'; });
    var dismantlePolicies = POLICIES.filter(function (p) { return p.direction === 'dismantle'; });

    var aboveMeta = buildMeta(buildPolicies);   assignRows(aboveMeta);
    var belowMeta = buildMeta(dismantlePolicies); assignRows(belowMeta);

    temp.remove();

    // ── 5. RENDER MARKERS ──────────────────────────
    // The figure sits on the project's near-black body bg,
    // The figure now sits on a light cream backdrop, so
    // labels are dark ink. Year is deep near-black, with the
    // policy name slightly less saturated. Dismantle names
    // adopt a deep rust to encode direction in text color.
    var BUILD_YEAR_COLOR  = '#15110d';
    var BUILD_NAME_COLOR  = '#2a2520';
    var DISMANTLE_YEAR_COLOR = '#15110d';
    var DISMANTLE_NAME_COLOR = '#8a3018';

    function renderMarker(m, side) {
      var p = m.policy;
      var dom = DOMAINS.find(function (d) { return d.key === p.domain; });
      var isBuild = side === 'above';

      // Group origin sits at the dot's anchor on the ribbon.
      // The dot translates outward from the ribbon by m.stem.
      var anchorY = isBuild ? RIBBON_TOP : RIBBON_BOTTOM;
      var sign    = isBuild ? -1 : 1;
      var circleY = anchorY + sign * m.stem;

      var grp = svgSel.append('g')
        .attr('class', 'policy-marker policy-' + p.direction)
        .style('cursor', 'pointer');

      // Stem — subtle, just enough to connect dot to ribbon.
      grp.append('line')
        .attr('x1', m.x).attr('x2', m.x)
        .attr('y1', anchorY).attr('y2', circleY)
        .attr('stroke', isBuild ? dom.color : '#a04020')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.45);

      // Dot — r=11. A 2px halo of the page bg gives separation
      // from the stem/ribbon without imposing a cream ring.
      grp.append('circle')
        .attr('cx', m.x).attr('cy', circleY)
        .attr('r', DOT_RADIUS + 2)
        .attr('fill', '#000')
        .attr('stroke', 'none');

      var circle = grp.append('circle')
        .attr('cx', m.x).attr('cy', circleY)
        .attr('r', DOT_RADIUS)
        .attr('fill', isBuild ? dom.color : 'rgba(15,12,9,0)')
        .attr('stroke', isBuild ? '#2d6a4f' : '#a04020')
        .attr('stroke-width', isBuild ? 1.8 : 2.5);

      // Stacked centered labels.
      //   Build side: YEAR (top) → NAME → dot.
      //   Dismantle:  dot → NAME → YEAR (bottom).
      var nearY = circleY + sign * (DOT_RADIUS + DOT_LABEL_GAP);  // nearest line to dot
      var farY  = nearY   + sign * YEAR_NAME_GAP;                 // farther line

      // On build, NAME is the line nearest the dot; on dismantle,
      // also NAME nearest the dot (so the year is always the
      // outermost element — easy to scan).
      var nameY = nearY;
      var yearY = farY;

      grp.append('text')
        .attr('class', 'policy-year')
        .attr('x', m.x)
        .attr('y', yearY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '14px')
        .style('font-weight', '700')
        .style('letter-spacing', '0.02em')
        .style('fill', isBuild ? BUILD_YEAR_COLOR : DISMANTLE_YEAR_COLOR)
        .style('pointer-events', 'none')
        .text(p.year);

      grp.append('text')
        .attr('class', 'policy-name')
        .attr('x', m.x)
        .attr('y', nameY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-family', 'Inter, sans-serif')
        .style('font-size', '12px')
        .style('font-weight', '400')
        .style('fill', isBuild ? BUILD_NAME_COLOR : DISMANTLE_NAME_COLOR)
        .style('pointer-events', 'none')
        .text(m.shortName);

      grp.on('mouseenter', function () {
        circle.transition().duration(180)
          .attr('r', DOT_RADIUS + 3)
          .attr('stroke-width', isBuild ? 2.2 : 3);
        showTooltip(p, dom);
      });
      grp.on('mouseleave', function () {
        circle.transition().duration(180)
          .attr('r', DOT_RADIUS)
          .attr('stroke-width', isBuild ? 1.8 : 2.5);
        hideTooltip();
      });
    }

    aboveMeta.forEach(function (m) { renderMarker(m, 'above'); });
    belowMeta.forEach(function (m) { renderMarker(m, 'below'); });

    // ── 6. TOOLTIP ────────────────────────────────
    var tooltip = d3.select('body').append('div')
      .attr('class', 'arch-tooltip')
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 9999)
      .style('background', 'rgba(15,12,9,0.97)')
      .style('border', '1px solid rgba(201,169,110,0.4)')
      .style('padding', '0.85rem 1rem')
      .style('max-width', '320px')
      .style('color', '#d4cfc4')
      .style('font-family', 'Inter, sans-serif')
      .style('font-size', '12px')
      .style('line-height', '1.5');

    function showTooltip(p, dom) {
      var dir = p.direction === 'build' ? 'Build' : 'Dismantle';
      var dirColor = p.direction === 'build' ? '#2d6a4f' : '#a04020';
      tooltip.html(
        '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:22px;font-style:italic;color:#c9a96e;line-height:1;">' + p.year + '</div>' +
        '<div style="font-weight:600;font-size:14px;margin:0.45rem 0 0.6rem;color:#e8e3d8;">' + p.name + '</div>' +
        '<div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:0.55rem;">' +
          '<span style="color:' + dom.color + ';">' + dom.label + '</span>' +
          ' · <span style="color:' + dirColor + ';">' + dir + '</span>' +
        '</div>' +
        '<div style="font-family:Georgia,serif;font-style:italic;font-size:12px;color:#a8a39a;max-width:280px;">' + p.effect + '</div>'
      );
      tooltip.transition().duration(150).style('opacity', 1);
    }
    function hideTooltip() {
      tooltip.transition().duration(150).style('opacity', 0);
    }
    document.addEventListener('mousemove', function (e) {
      tooltip.style('left', (e.clientX + 16) + 'px')
             .style('top',  (e.clientY + 16) + 'px');
    });

    function maxRow(meta) {
      return meta.reduce(function (mx, m) { return Math.max(mx, m.row); }, 0) + 1;
    }
    console.log('[fig01] policy ribbon rendered. ' +
                buildPolicies.length + ' build above (' + maxRow(aboveMeta) + ' rows), ' +
                dismantlePolicies.length + ' dismantle below (' + maxRow(belowMeta) + ' rows).');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
