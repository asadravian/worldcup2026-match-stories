/* Match story engine.
   Reads the match JSON referenced by <body data-match="...">, renders the page,
   then wires up the scroll clock, donut, slice bars, radar and squad filter.
   Fields ending in "Html" are trusted authored markup; everything else is escaped. */
(function(){
  'use strict';

  var matchUrl = document.body.dataset.match;

  fetch(matchUrl)
    .then(function(res){
      if(!res.ok) throw new Error('HTTP ' + res.status + ' loading ' + matchUrl);
      return res.json();
    })
    .then(function(data){
      applyMeta(data);
      applyTheme(data.teams);
      document.body.innerHTML = buildPage(data);
      initInteractions(data);
    })
    .catch(function(err){
      document.body.innerHTML =
        '<div class="load-error">Could not load match data (' + esc(String(err.message || err)) + ').<br>' +
        'Serve this folder over HTTP, e.g. <strong>python -m http.server</strong>, then reload.</div>';
    });

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function applyMeta(data){
    document.title = data.meta.title;
    var desc = document.querySelector('meta[name="description"]');
    if(desc) desc.setAttribute('content', data.meta.description);
    document.documentElement.lang = data.meta.lang || 'en';
  }

  // Derive the team colour tints the stylesheet expects.
  function applyTheme(teams){
    var root = document.documentElement.style;
    root.setProperty('--home', teams.home.color);
    root.setProperty('--away', teams.away.color);
    root.setProperty('--home-text', teams.home.textOnColor);
    root.setProperty('--away-text', teams.away.textOnColor);
    root.setProperty('--home-soft', alpha(teams.home.color, .4));
    root.setProperty('--home-faint', alpha(teams.home.color, .16));
    root.setProperty('--home-fill', alpha(teams.home.color, .22));
    root.setProperty('--away-soft', alpha(teams.away.color, .4));
    root.setProperty('--away-faint', alpha(teams.away.color, .14));
    root.setProperty('--away-fill', alpha(teams.away.color, .14));
  }

  function alpha(hex, a){
    var m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if(!m) return hex;
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n>>16&255) + ',' + (n>>8&255) + ',' + (n&255) + ',' + a + ')';
  }

  /* ---------- markup ---------- */

  function buildPage(d){
    return heroHtml(d) + timelineHtml(d) + statsHtml(d) + chartsHtml(d) +
      '<div id="tip" aria-hidden="true"></div>' +
      controversyHtml(d) + nextHtml(d) + footerHtml(d);
  }

  function heroHtml(d){
    var c = d.competition, t = d.teams, s = d.score;
    return '' +
    '<header class="hero">' +
      '<div class="wrap">' +
        '<div class="eyebrow">' +
          '<span>' + esc(c.tournament) + '</span><span class="dot"></span>' +
          '<span>' + esc(c.round) + '</span><span class="dot"></span>' +
          '<span>' + esc(c.venue) + '</span>' +
        '</div>' +
        '<div class="scoreline" aria-label="Final score: ' + esc(t.home.name) + ' ' + s.home + ', ' + esc(t.away.name) + ' ' + s.away + (s.note ? ', ' + esc(s.note.toLowerCase()) : '') + '">' +
          '<span class="team home">' + esc(t.home.name) + '</span>' +
          '<span class="score">' + s.home + '–' + s.away + '</span>' +
          '<span class="team away">' + esc(t.away.name) + '</span>' +
        '</div>' +
        '<p class="sub">' + d.hero.subHtml + '</p>' +
        (s.note ? '<span class="aet">' + esc(s.note) + '</span>' : '') +
      '</div>' +
    '</header>';
  }

  function timelineHtml(d){
    var tl = d.timeline;
    return '' +
    '<section class="timeline-section" id="timeline">' +
      '<div class="clock-sticky">' +
        '<div class="wrap">' +
          '<span id="matchClock">0\'</span>' +
          '<span class="clock-label">Match clock · scroll to play</span>' +
        '</div>' +
      '</div>' +
      '<div class="wrap">' +
        '<div class="kicker">' + esc(tl.kicker) + '</div>' +
        '<h2>' + esc(tl.heading) + '</h2>' +
        '<p class="lede">' + esc(tl.lede) + '</p>' +
        '<div class="tl" id="tl">' +
          tl.events.map(function(ev){
            return '<div class="event ' + esc(ev.type) + '" data-minute="' + ev.minute + '">' +
              '<span class="minute">' + esc(ev.minuteLabel) + '</span>' +
              '<span class="tag">' + esc(ev.tag) + '</span>' +
              '<h3>' + esc(ev.title) + '</h3>' +
              '<p>' + ev.textHtml + '</p>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function statsHtml(d){
    var st = d.stats, t = d.teams;
    return '' +
    '<section class="stats-section">' +
      '<div class="wrap">' +
        '<div class="kicker">' + esc(st.kicker) + '</div>' +
        '<h2>' + esc(st.heading) + '</h2>' +
        '<p class="lede">' + esc(st.lede) + '</p>' +
        '<div class="legend">' +
          '<span class="home"><i></i>' + esc(t.home.name) + '</span>' +
          '<span class="away"><i></i>' + esc(t.away.name) + '</span>' +
        '</div>' +
        '<div id="stats">' +
          st.rows.map(function(row){
            return '<div class="stat" data-n="' + row.home + '" data-e="' + row.away + '">' +
              '<div class="row"><span class="name">' + esc(row.name) + '</span>' +
              '<span class="vals"><span class="vh">' + row.home + '</span><span class="va">' + row.away + '</span></span></div>' +
              '<div class="bars"><div class="bh"></div><div class="ba"></div></div>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<p class="stat-note">' + esc(st.note) + '</p>' +
      '</div>' +
    '</section>';
  }

  function chartsHtml(d){
    var ch = d.charts, t = d.teams;
    var poss = ch.possession, shots = ch.shots, radar = ch.radar, sq = d.squads;

    function sliceRow(teamKey, teamName, values){
      var total = values.reduce(function(a,b){ return a+b; }, 0);
      return '<div class="slice-group">' +
        '<div class="slice-team"><span class="t-' + teamKey + '">' + esc(teamName) + '</span><span class="total">' + total + ' shots</span></div>' +
        '<div class="slice-bar">' +
          shots.categories.map(function(cat, i){
            return '<div class="slice ' + esc(cat.key) + '-' + teamKey + '" style="flex:' + values[i] + '" tabindex="0"' +
              ' data-label="' + esc(teamName) + ' · ' + esc(cat.label.toLowerCase()) + '" data-value="' + values[i] + '">' + values[i] + '</div>';
          }).join('') +
        '</div>' +
      '</div>';
    }

    function squadTable(teamKey, teamName, players){
      return '<div class="squad ' + teamKey + '">' +
        '<table>' +
          '<caption>' + esc(teamName) + '</caption>' +
          '<thead><tr><th>Pos</th><th>Player</th></tr></thead>' +
          '<tbody>' +
            players.map(function(p){
              return '<tr data-pos="' + esc(p.role) + '"><td class="pos">' + esc(p.pos) + '</td><td>' + esc(p.name) + '</td></tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>';
    }

    return '' +
    '<section class="charts-section">' +
      '<div class="wrap">' +
        '<div class="kicker">' + esc(ch.kicker) + '</div>' +
        '<h2>' + esc(ch.heading) + '</h2>' +
        '<p class="lede">' + esc(ch.lede) + '</p>' +
        '<div class="charts-grid">' +
          '<div class="chart-block">' +
            '<h3>' + esc(poss.title) + '</h3>' +
            '<div class="donut-wrap">' +
              '<svg viewBox="0 0 200 200" role="img" aria-label="Possession donut chart: ' + esc(t.home.name) + ' ' + poss.home + ' percent, ' + esc(t.away.name) + ' ' + poss.away + ' percent">' +
                '<circle id="segHome" class="donut-seg" cx="100" cy="100" r="80" fill="none" stroke="' + esc(t.home.color) + '" stroke-width="26" tabindex="0"' +
                  ' data-label="' + esc(t.home.name) + ' possession" data-value="' + poss.home + '%"></circle>' +
                '<circle id="segAway" class="donut-seg" cx="100" cy="100" r="80" fill="none" stroke="' + esc(t.away.color) + '" stroke-width="26" tabindex="0"' +
                  ' data-label="' + esc(t.away.name) + ' possession" data-value="' + poss.away + '%"></circle>' +
              '</svg>' +
              '<div class="donut-center">' +
                '<span class="big" id="donutBig">' + d.durationMinutes + '\'</span>' +
                '<span class="small" id="donutSmall">Hover a segment</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="chart-block">' +
            '<h3>' + esc(shots.title) + '</h3>' +
            sliceRow('home', t.home.name, shots.home) +
            sliceRow('away', t.away.name, shots.away) +
            '<div class="slice-legend">' +
              shots.categories.map(function(cat){
                return '<span class="l-' + esc(cat.key) + '"><i></i>' + esc(cat.label) + '</span>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="radar-block">' +
          '<div class="chart-block"><h3>' + esc(radar.title) + '</h3></div>' +
          '<div class="radar-flex">' +
            '<div class="radar-wrap">' +
              '<svg id="radar" viewBox="0 0 460 420" role="img" aria-label="Radar chart comparing ' + esc(t.home.name) + ' and ' + esc(t.away.name) + ' across ' +
                esc(radar.axes.map(function(a){ return a.label.toLowerCase(); }).join(', ')) + '"></svg>' +
            '</div>' +
            '<div class="radar-side">' +
              '<p>' + radar.sideHtml + '</p>' +
              '<div class="radar-toggles">' +
                '<button class="t-home" data-team="home" aria-pressed="true"><i></i>' + esc(t.home.name) + '</button>' +
                '<button class="t-away" data-team="away" aria-pressed="true"><i></i>' + esc(t.away.name) + '</button>' +
              '</div>' +
              '<p class="radar-note">' + esc(radar.note) + '</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="table-block">' +
          '<div class="chart-block"><h3>' + esc(sq.title) + '</h3></div>' +
          '<div class="filters" role="group" aria-label="Filter players by position">' +
            sq.positions.map(function(pos, i){
              return '<button' + (i === 0 ? ' class="active"' : '') + ' data-pos="' + esc(pos.key) + '">' + esc(pos.label) + '</button>';
            }).join('') +
          '</div>' +
          '<div class="squads">' +
            squadTable('home', t.home.name, sq.home) +
            squadTable('away', t.away.name, sq.away) +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function controversyHtml(d){
    var co = d.controversy;
    return '' +
    '<section class="contro-section">' +
      '<div class="wrap">' +
        '<div class="kicker">' + esc(co.kicker) + '</div>' +
        '<h2>' + esc(co.heading) + '</h2>' +
        '<div class="contro-grid">' +
          co.cards.map(function(card){
            return '<div class="contro-card">' +
              '<span class="tag">' + esc(card.tag) + '</span>' +
              '<h3>' + esc(card.title) + '</h3>' +
              '<p>' + card.textHtml + '</p>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function nextHtml(d){
    var nx = d.next;
    return '' +
    '<section class="next-section">' +
      '<div class="wrap">' +
        '<div class="kicker">' + esc(nx.kicker) + '</div>' +
        '<h2>' + esc(nx.heading) + '</h2>' +
        '<div class="next-card">' +
          '<div>' +
            '<div class="next-teams">' + esc(nx.teams[0]) + ' <span class="v">vs</span> ' + esc(nx.teams[1]) + '</div>' +
            '<div class="prob">' +
              '<div class="bars3">' +
                nx.probabilities.map(function(p){
                  return '<div style="width:' + p.pct + '%;background:' + esc(p.color) + '"></div>';
                }).join('') +
              '</div>' +
              '<div class="keys">' +
                nx.probabilities.map(function(p){
                  return '<span>' + esc(p.label) + ' ' + p.pct + '%</span>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="next-meta">' + nx.metaLines.map(esc).join('<br>') + '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function footerHtml(d){
    return '' +
    '<footer>' +
      '<div class="wrap">' +
        '<p class="built">' + esc(d.footer.built) + '</p>' +
        '<p>' + d.footer.creditsHtml + '</p>' +
      '</div>' +
    '</footer>';
  }

  /* ---------- interactions ---------- */

  function initInteractions(data){
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reveal timeline events
    var events = document.querySelectorAll('.event');
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    },{threshold:0.25});
    events.forEach(function(e){ io.observe(e); });

    // Scroll-driven match clock
    var duration = data.durationMinutes;
    var clock = document.getElementById('matchClock');
    var tl = document.getElementById('tl');
    function updateClock(){
      var rect = tl.getBoundingClientRect();
      var vh = window.innerHeight;
      var total = rect.height - vh*0.4;
      var progress = Math.min(1, Math.max(0, (vh*0.6 - rect.top) / total));
      var minute = Math.round(progress * duration);
      clock.textContent = minute + "'";
    }
    updateClock();
    window.addEventListener('scroll', updateClock, {passive:true});
    window.addEventListener('resize', updateClock);

    // Donut chart
    (function(){
      var r = 80, C = 2*Math.PI*r;
      var home = data.charts.possession.home, away = data.charts.possession.away;
      var segHome = document.getElementById('segHome');
      var segAway = document.getElementById('segAway');
      // start at 12 o'clock
      segHome.setAttribute('stroke-dasharray', (home/100*C) + ' ' + C);
      segHome.setAttribute('transform','rotate(-90 100 100)');
      segAway.setAttribute('stroke-dasharray', (away/100*C) + ' ' + C);
      segAway.setAttribute('transform','rotate(' + (home/100*360 - 90) + ' 100 100)');
      var big = document.getElementById('donutBig');
      var small = document.getElementById('donutSmall');
      var idleBig = duration + "'", idleSmall = 'Hover a segment';
      function setCenter(v,l){ big.textContent = v; small.textContent = l; }
      [[segHome, home+'%', data.teams.home.name],[segAway, away+'%', data.teams.away.name]].forEach(function(cfg){
        cfg[0].addEventListener('mouseenter',function(){ setCenter(cfg[1],cfg[2]); });
        cfg[0].addEventListener('focus',function(){ setCenter(cfg[1],cfg[2]); });
        cfg[0].addEventListener('mouseleave',function(){ setCenter(idleBig, idleSmall); });
        cfg[0].addEventListener('blur',function(){ setCenter(idleBig, idleSmall); });
      });
    })();

    // Radar chart: six axes, scaled per-axis to the match leader
    (function(){
      var svg = document.getElementById('radar');
      var NS = 'http://www.w3.org/2000/svg';
      var cx = 230, cy = 210, R = 150;
      var axes = data.charts.radar.axes;
      var n = axes.length;
      function pt(i, frac){
        var ang = (Math.PI*2*i/n) - Math.PI/2;
        return [cx + Math.cos(ang)*R*frac, cy + Math.sin(ang)*R*frac];
      }
      function el(name, attrs){
        var e = document.createElementNS(NS, name);
        for(var k in attrs) e.setAttribute(k, attrs[k]);
        return e;
      }
      // grid rings
      [0.25,0.5,0.75,1].forEach(function(f){
        var pts = [];
        for(var i=0;i<n;i++) pts.push(pt(i,f).join(','));
        svg.appendChild(el('polygon',{points:pts.join(' '),class:'radar-grid'}));
      });
      // spokes + labels
      for(var i=0;i<n;i++){
        var outer = pt(i,1);
        svg.appendChild(el('line',{x1:cx,y1:cy,x2:outer[0],y2:outer[1],class:'radar-spoke'}));
        var lp = pt(i,1.17);
        var t = el('text',{x:lp[0],y:lp[1],class:'radar-axis-label',
          'text-anchor': Math.abs(lp[0]-cx)<12 ? 'middle' : (lp[0]>cx?'start':'end'),
          'dominant-baseline':'middle'});
        t.textContent = axes[i].label;
        svg.appendChild(t);
      }
      // team polygons + dots
      function fracFor(team, ax){
        var max = Math.max(ax.home, ax.away);
        return (ax[team]/max)*0.96 + 0.04;
      }
      var groups = {};
      ['home','away'].forEach(function(team){
        var pts = [];
        for(var i=0;i<n;i++) pts.push(pt(i, fracFor(team, axes[i])).join(','));
        var poly = el('polygon',{points:pts.join(' '),class:'radar-poly '+team});
        svg.appendChild(poly);
        var dots = [];
        for(var i=0;i<n;i++){
          var p = pt(i, fracFor(team, axes[i]));
          var d = el('circle',{cx:p[0],cy:p[1],r:5,class:'radar-dot '+team,tabindex:0,
            'data-label':data.teams[team].name+' · '+axes[i].label,
            'data-value':axes[i][team]+axes[i].unit});
          svg.appendChild(d);
          dots.push(d);
        }
        groups[team] = {poly:poly, dots:dots, visible:true};
      });
      // toggles
      document.querySelectorAll('.radar-toggles button').forEach(function(b){
        b.addEventListener('click',function(){
          var team = b.dataset.team;
          var g = groups[team];
          g.visible = !g.visible;
          b.classList.toggle('off', !g.visible);
          b.setAttribute('aria-pressed', g.visible);
          g.poly.classList.toggle('hidden', !g.visible);
          g.dots.forEach(function(d){ d.classList.toggle('hidden', !g.visible); });
        });
      });
    })();

    // Shared tooltip for donut + slice bars + radar dots
    // (bound after the radar renders so its dots are included)
    (function(){
      var tip = document.getElementById('tip');
      var targets = document.querySelectorAll('[data-label]');
      targets.forEach(function(t){
        t.addEventListener('mousemove',function(ev){
          tip.textContent = t.dataset.label + ' · ' + t.dataset.value;
          tip.style.left = (ev.clientX + 14) + 'px';
          tip.style.top = (ev.clientY - 34) + 'px';
          tip.classList.add('show');
        });
        t.addEventListener('mouseleave',function(){ tip.classList.remove('show'); });
        t.addEventListener('focus',function(){
          var r = t.getBoundingClientRect();
          tip.textContent = t.dataset.label + ' · ' + t.dataset.value;
          tip.style.left = (r.left + r.width/2) + 'px';
          tip.style.top = (r.top - 38) + 'px';
          tip.classList.add('show');
        });
        t.addEventListener('blur',function(){ tip.classList.remove('show'); });
      });
    })();

    // Squad position filter
    (function(){
      var buttons = document.querySelectorAll('.filters button');
      buttons.forEach(function(b){
        b.addEventListener('click',function(){
          buttons.forEach(function(x){ x.classList.remove('active'); });
          b.classList.add('active');
          var pos = b.dataset.pos;
          document.querySelectorAll('.squad tbody tr').forEach(function(tr){
            tr.classList.toggle('dim', pos !== 'all' && tr.dataset.pos !== pos);
          });
        });
      });
    })();

    // Animated stat bars
    var stats = document.querySelectorAll('.stat');
    var sio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        var el = en.target;
        var n = parseFloat(el.dataset.n), e = parseFloat(el.dataset.e);
        var sum = n + e;
        var bh = el.querySelector('.bh'), ba = el.querySelector('.ba');
        var apply = function(){
          bh.style.width = (n/sum*100) + '%';
          ba.style.width = (e/sum*100) + '%';
        };
        reduced ? apply() : requestAnimationFrame(apply);
        sio.unobserve(el);
      });
    },{threshold:0.4});
    stats.forEach(function(s){ sio.observe(s); });
  }
})();
