<#
.SYNOPSIS
    세실리아(char_cecilia) 2.5등신 2단계 파츠 시트 3장 (R02 A-19: 따로 그리기 방식) 제작 및 정량 비교 스크립트
.DESCRIPTION
    확정된 2.5등신 c00_complete.png(v0.55.87) 기준으로 NovelAI(nai_parts_v2/)에서 따로 생성·선별한 11개 파츠를
    단일 균일 배율(Uniform Scale)로 정렬하고 색상 톤을 통일한 뒤, sheet1_head / sheet2_body_arms / sheet3_weapons를 합성한다.
    또한 scratch/cecilia_25h_reassembled.png 재조립 이미지와 c00_complete.png 간 정량 픽셀 차이(구멍/삐져나옴)를 출력한다.
#>

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class CeciliaV2SheetBuilder
{
    static readonly Color CHROMA = Color.FromArgb(0, 255, 0);

    static bool IsPureGreen(Color c) { return c.R < 35 && c.G > 210 && c.B < 35; }
    static bool IsNaiGreen(byte r, byte g, byte b) { return g > 155 && b < 115 && (g - b) > 85 && (g - r) > 35; }
    static bool IsDarkLine(Color c) { return c.R < 90 && c.G < 90 && c.B < 105; }

    static Bitmap NewGreenCanvas(int w, int h)
    {
        Bitmap b = new Bitmap(w, h, PixelFormat.Format24bppRgb);
        using (Graphics g = Graphics.FromImage(b)) { g.Clear(CHROMA); }
        return b;
    }

    // NAI 생성 PNG에서 외곽 flood-fill로 크로마키 배경 분리 후 순수 #00FF00 + 디프린지 + 최대 덩어리(또는 다중 연결 정리) 적용
    static Bitmap LoadCleanNaiPart(string path, bool keepAllLarge = false, int minArea = 150)
    {
        Bitmap src = new Bitmap(path);
        int w = src.Width, h = src.Height;
        BitmapData bd = src.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        byte[] px = new byte[w * h * 4];
        Marshal.Copy(bd.Scan0, px, 0, px.Length);
        src.UnlockBits(bd);
        src.Dispose();

        // 1) 외곽 모서리 Flood-Fill
        bool[] bg = new bool[w * h];
        Queue<int> q = new Queue<int>();
        int[] seeds = { 0, w - 1, (h - 1) * w, w * h - 1 };
        foreach (int s in seeds) { bg[s] = true; q.Enqueue(s); }
        int[] dx = { -1, 1, 0, 0 }, dy = { 0, 0, -1, 1 };
        while (q.Count > 0)
        {
            int cur = q.Dequeue();
            int cx = cur % w, cy = cur / w;
            for (int k = 0; k < 4; k++)
            {
                int nx = cx + dx[k], ny = cy + dy[k];
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                int np = ny * w + nx;
                if (bg[np]) continue;
                int pi = np * 4;
                if (IsNaiGreen(px[pi + 2], px[pi + 1], px[pi]))
                {
                    bg[np] = true; q.Enqueue(np);
                }
            }
        }
        // 2) 내부 고립된 뚜렷한 초록 구멍도 배경화 (단, 눈동자/보석 청록색 보호)
        for (int i = 0; i < w * h; i++)
        {
            if (bg[i]) continue;
            int pi = i * 4;
            byte pr = px[pi + 2], pg = px[pi + 1], pb = px[pi];
            if (pg > 190 && pr < 95 && pb < 95 && (pg - Math.Max(pr, pb)) > 100) bg[i] = true;
        }

        Bitmap clean = NewGreenCanvas(w, h);
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                int p = y * w + x;
                if (bg[p]) continue;
                int pi = p * 4;
                byte rr = px[pi + 2], gg = px[pi + 1], bb = px[pi];
                int mrb = Math.Max(rr, bb);
                if (gg - mrb > 18 && gg > 110) gg = (byte)Math.Min((int)gg, mrb + 5);
                clean.SetPixel(x, y, Color.FromArgb(rr, gg, bb));
            }

        DefringeAndSpecks(clean, minArea, !keepAllLarge);
        return clean;
    }

    static void DefringeAndSpecks(Bitmap b, int minArea, bool onlyLargest)
    {
        int w = b.Width, h = b.Height;
        for (int y = 1; y < h - 1; y++)
            for (int x = 1; x < w - 1; x++)
            {
                Color c = b.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                int mrb = Math.Max(c.R, c.B);
                if (c.G > 110 && (c.G - mrb) > 12)
                {
                    bool adjBg = IsPureGreen(b.GetPixel(x - 1, y)) || IsPureGreen(b.GetPixel(x + 1, y)) ||
                                 IsPureGreen(b.GetPixel(x, y - 1)) || IsPureGreen(b.GetPixel(x, y + 1));
                    if (adjBg && (c.G - mrb) > 20) b.SetPixel(x, y, CHROMA);
                    else b.SetPixel(x, y, Color.FromArgb(c.R, Math.Min((int)c.G, mrb + 5), c.B));
                }
            }

        bool[,] vis = new bool[w, h];
        List<List<Point>> comps = new List<List<Point>>();
        int[] dx = { -1, 0, 1, -1, 1, -1, 0, 1 };
        int[] dy = { -1, -1, -1, 0, 0, 1, 1, 1 };
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                if (vis[x, y] || IsPureGreen(b.GetPixel(x, y))) continue;
                List<Point> comp = new List<Point>();
                Queue<Point> q = new Queue<Point>();
                vis[x, y] = true; q.Enqueue(new Point(x, y));
                while (q.Count > 0)
                {
                    Point p = q.Dequeue(); comp.Add(p);
                    for (int k = 0; k < 8; k++)
                    {
                        int nx = p.X + dx[k], ny = p.Y + dy[k];
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h && !vis[nx, ny] && !IsPureGreen(b.GetPixel(nx, ny)))
                        {
                            vis[nx, ny] = true; q.Enqueue(new Point(nx, ny));
                        }
                    }
                }
                comps.Add(comp);
            }

        if (onlyLargest && comps.Count > 1)
        {
            comps.Sort((a, c) => c.Count.CompareTo(a.Count));
            for (int i = 1; i < comps.Count; i++)
                foreach (Point p in comps[i]) b.SetPixel(p.X, p.Y, CHROMA);
        }
        else
        {
            foreach (var comp in comps)
                if (comp.Count < minArea)
                    foreach (Point p in comp) b.SetPixel(p.X, p.Y, CHROMA);
        }
    }

    static Rectangle GetBounds(Bitmap b)
    {
        int mx = b.Width, Mx = -1, my = b.Height, My = -1;
        for (int y = 0; y < b.Height; y++)
            for (int x = 0; x < b.Width; x++)
                if (!IsPureGreen(b.GetPixel(x, y)))
                {
                    if (x < mx) mx = x; if (x > Mx) Mx = x;
                    if (y < my) my = y; if (y > My) My = y;
                }
        return (Mx < mx) ? Rectangle.Empty : new Rectangle(mx, my, Mx - mx + 1, My - my + 1);
    }

    static Bitmap CropTight(Bitmap src, int pad = 2)
    {
        Rectangle r = GetBounds(src);
        if (r.IsEmpty) return NewGreenCanvas(16, 16);
        Bitmap dst = NewGreenCanvas(r.Width + pad * 2, r.Height + pad * 2);
        for (int y = 0; y < r.Height; y++)
            for (int x = 0; x < r.Width; x++)
            {
                Color c = src.GetPixel(r.X + x, r.Y + y);
                if (!IsPureGreen(c)) dst.SetPixel(x + pad, y + pad, c);
            }
        return dst;
    }

    // 단일 균일 배율 + 회전(반전 금지) 전경 가중 리샘플링
    static Bitmap TransformUniform(Bitmap src, double scale, double rotDeg = 0.0)
    {
        Rectangle r = GetBounds(src);
        if (r.IsEmpty) return NewGreenCanvas(16, 16);
        double radAngle = rotDeg * Math.PI / 180.0;
        double cosA = Math.Cos(radAngle), sinA = Math.Sin(radAngle);

        double scx = r.X + r.Width / 2.0, scy = r.Y + r.Height / 2.0;
        double hw = r.Width * scale / 2.0, hh = r.Height * scale / 2.0;
        double rotW = Math.Abs(hw * cosA) + Math.Abs(hh * sinA);
        double rotH = Math.Abs(hw * sinA) + Math.Abs(hh * cosA);
        int dw = (int)Math.Ceiling(rotW * 2) + 8;
        int dh = (int)Math.Ceiling(rotH * 2) + 8;
        Bitmap dst = NewGreenCanvas(dw, dh);
        double dcx = dw / 2.0, dcy = dh / 2.0;

        double inv = 1.0 / scale;
        double rad = Math.Max(1.0, inv * 0.72);

        for (int y = 0; y < dh; y++)
        {
            for (int x = 0; x < dw; x++)
            {
                double ox = (x - dcx) * inv;
                double oy = (y - dcy) * inv;
                // 역회전으로 원본 좌표 매핑
                double sx = scx + ox * cosA + oy * sinA;
                double sy = scy - ox * sinA + oy * cosA;
                if (sx < -1 || sx > src.Width || sy < -1 || sy > src.Height) continue;

                int x0 = Math.Max(0, (int)Math.Floor(sx - rad));
                int x1 = Math.Min(src.Width - 1, (int)Math.Ceiling(sx + rad));
                int y0 = Math.Max(0, (int)Math.Floor(sy - rad));
                int y1 = Math.Min(src.Height - 1, (int)Math.Ceiling(sy + rad));

                double wFg = 0, wAll = 0, rS = 0, gS = 0, bS = 0;
                for (int iy = y0; iy <= y1; iy++)
                {
                    double wy = Math.Max(0.0, 1.0 - Math.Abs(iy - sy) / (rad + 0.25));
                    for (int ix = x0; ix <= x1; ix++)
                    {
                        double wx = Math.Max(0.0, 1.0 - Math.Abs(ix - sx) / (rad + 0.25));
                        double wt = wx * wy;
                        if (wt <= 0) continue;
                        wAll += wt;
                        Color c = src.GetPixel(ix, iy);
                        if (!IsPureGreen(c))
                        {
                            wFg += wt;
                            rS += c.R * wt; gS += c.G * wt; bS += c.B * wt;
                        }
                    }
                }
                if (wAll > 0 && (wFg / wAll) >= 0.48)
                {
                    int rr = Math.Min(255, Math.Max(0, (int)Math.Round(rS / wFg)));
                    int gg = Math.Min(255, Math.Max(0, (int)Math.Round(gS / wFg)));
                    int bb = Math.Min(255, Math.Max(0, (int)Math.Round(bS / wFg)));
                    int mrb = Math.Max(rr, bb);
                    if (gg - mrb > 10) gg = mrb + 5;
                    dst.SetPixel(x, y, Color.FromArgb(rr, gg, bb));
                }
            }
        }
        DefringeAndSpecks(dst, 150, true);
        Bitmap tight = CropTight(dst, 2);
        dst.Dispose();
        return tight;
    }

    static void BlitTransparent(Bitmap dst, Bitmap part, int dx, int dy)
    {
        for (int y = 0; y < part.Height; y++)
        {
            int ty = dy + y;
            if (ty < 0 || ty >= dst.Height) continue;
            for (int x = 0; x < part.Width; x++)
            {
                int tx = dx + x;
                if (tx < 0 || tx >= dst.Width) continue;
                Color c = part.GetPixel(x, y);
                if (!IsPureGreen(c)) dst.SetPixel(tx, ty, c);
            }
        }
    }

    // 피부 대표색 평균 측정 및 대상 RGB(c00: 253, 235, 221)로 정밀 톤 매칭
    static void MatchSkinTone(Bitmap b, byte targetR = 253, byte targetG = 235, byte targetB = 221)
    {
        long rS = 0, gS = 0, bS = 0, cnt = 0;
        for (int y = 0; y < b.Height; y++)
            for (int x = 0; x < b.Width; x++)
            {
                Color c = b.GetPixel(x, y);
                if (IsPureGreen(c) || IsDarkLine(c)) continue;
                // 밝은 살구색 영역 평균 (볼 홍조·하얀 눈자 제외)
                if (c.R >= 225 && c.G >= 185 && c.B >= 165 && (c.R - c.B) >= 8 && (c.R - c.B) <= 45)
                {
                    rS += c.R; gS += c.G; bS += c.B; cnt++;
                }
            }
        if (cnt < 100) return;
        double avgR = (double)rS / cnt, avgG = (double)gS / cnt, avgB = (double)bS / cnt;
        double dr = targetR - avgR, dg = targetG - avgG, db = targetB - avgB;
        for (int y = 0; y < b.Height; y++)
            for (int x = 0; x < b.Width; x++)
            {
                Color c = b.GetPixel(x, y);
                if (IsPureGreen(c) || IsDarkLine(c)) continue;
                // 살구/피부색(R >= B+5, 밝기 > 170) 계열에만 일괄 오프셋 적용해 head_base와 face 색 경계 제거
                if (c.R >= 195 && c.G >= 150 && (c.R - c.B) >= 5)
                {
                    int nr = Math.Min(255, Math.Max(0, (int)Math.Round(c.R + dr)));
                    int ng = Math.Min(255, Math.Max(0, (int)Math.Round(c.G + dg)));
                    int nb = Math.Min(255, Math.Max(0, (int)Math.Round(c.B + db)));
                    b.SetPixel(x, y, Color.FromArgb(nr, ng, nb));
                }
            }
    }

    // 파스텔 하늘색(머리카락/코트) 톤을 c00 기준(예: (184,211,238) or (189,219,246))으로 보라끼·형광끼 없이 부드럽게 맞춤
    static void MatchSkyBlueTone(Bitmap b, byte tR, byte tG, byte tB, bool preserveGoldAndWhite = true)
    {
        for (int y = 0; y < b.Height; y++)
            for (int x = 0; x < b.Width; x++)
            {
                Color c = b.GetPixel(x, y);
                if (IsPureGreen(c) || IsDarkLine(c)) continue;
                if (preserveGoldAndWhite && ((c.R > c.B + 12) || (c.R > 236 && c.G > 236 && c.B > 236))) continue;
                // 푸른/라벤더/보라 계열(B >= 135 && B >= R - 10) 픽셀을 밝기 유지하며 맑은 파스텔 하늘색 비율(R:tR, G:tG, B:tB)로 리맵
                if (c.B >= 130 && c.B >= c.R - 12 && !(c.R > 225 && c.G > 225 && c.B > 225 && (c.B - c.R) < 8))
                {
                    double lum = (c.R * 0.25 + c.G * 0.40 + c.B * 0.35) / ((tR * 0.25 + tG * 0.40 + tB * 0.35) + 1e-5);
                    lum = Math.Max(0.68, Math.Min(1.16, lum * 0.85 + 0.16));
                    int nr = Math.Min(255, Math.Max(0, (int)Math.Round(tR * lum)));
                    int ng = Math.Min(255, Math.Max(0, (int)Math.Round(tG * lum)));
                    int nb = Math.Min(255, Math.Max(0, (int)Math.Round(tB * lum)));
                    b.SetPixel(x, y, Color.FromArgb(nr, ng, nb));
                }
            }
    }

    // 아래 파츠 경계 외곽선(위쪽 또는 아래쪽 cutRows px)을 인접 내부 색으로 덮어 단면 무테 마감
    static void RemoveBoundaryOutline(Bitmap b, bool isTopEdge, int stripPx = 5)
    {
        Rectangle r = GetBounds(b);
        if (r.IsEmpty) return;
        if (isTopEdge)
        {
            for (int x = r.X; x < r.Right; x++)
            {
                int firstY = -1;
                for (int y = r.Y; y < Math.Min(b.Height, r.Y + stripPx + 14); y++)
                    if (!IsPureGreen(b.GetPixel(x, y))) { firstY = y; break; }
                if (firstY < 0) continue;
                // 아래쪽 첫 비-어두운 내부 색 찾기
                Color fill = CHROMA;
                for (int y = firstY + 1; y < Math.Min(b.Height, firstY + 12); y++)
                {
                    Color tc = b.GetPixel(x, y);
                    if (!IsPureGreen(tc) && !IsDarkLine(tc)) { fill = tc; break; }
                }
                if (IsPureGreen(fill)) continue;
                for (int dy = 0; dy < stripPx && firstY + dy < b.Height; dy++)
                {
                    Color c = b.GetPixel(x, firstY + dy);
                    if (!IsPureGreen(c) && IsDarkLine(c)) b.SetPixel(x, firstY + dy, fill);
                }
            }
        }
        else
        {
            for (int x = r.X; x < r.Right; x++)
            {
                int lastY = -1;
                for (int y = r.Bottom - 1; y >= Math.Max(0, r.Bottom - stripPx - 14); y--)
                    if (!IsPureGreen(b.GetPixel(x, y))) { lastY = y; break; }
                if (lastY < 0) continue;
                Color fill = CHROMA;
                for (int y = lastY - 1; y >= Math.Max(0, lastY - 12); y--)
                {
                    Color tc = b.GetPixel(x, y);
                    if (!IsPureGreen(tc) && !IsDarkLine(tc)) { fill = tc; break; }
                }
                if (IsPureGreen(fill)) continue;
                for (int dy = 0; dy < stripPx && lastY - dy >= 0; dy++)
                {
                    Color c = b.GetPixel(x, lastY - dy);
                    if (!IsPureGreen(c) && IsDarkLine(c)) b.SetPixel(x, lastY - dy, fill);
                }
            }
        }
    }

    public static void BuildAll(string c00Path, string npDir, string outDir, string scratchDir)
    {
        Bitmap c00 = new Bitmap(c00Path);

        // 1. head_base (v2_head_base_2328825396, 단일 균일 배율 0.74 + 피부색 통일 + 목 아래 단면 무테)
        Bitmap hbRaw = LoadCleanNaiPart(System.IO.Path.Combine(npDir, "v2_head_base_2328825396.png"));
        Bitmap headBase = TransformUniform(hbRaw, 0.74);
        hbRaw.Dispose();
        MatchSkinTone(headBase, 253, 235, 221);
        RemoveBoundaryOutline(headBase, false, 6);

        // 2. hair_front (v2_hair_front_2958565508, 단일 균일 배율 1.00 + 순수 파스텔 하늘색 톤 통일)
        Bitmap hfRaw = LoadCleanNaiPart(System.IO.Path.Combine(npDir, "v2_hair_front_2958565508.png"));
        Bitmap hairFront = TransformUniform(hfRaw, 1.00);
        hfRaw.Dispose();
        MatchSkyBlueTone(hairFront, 184, 211, 238, true);

        // 3. hair_back (v2_hair_back_r2_2684746856, 정수리 실선/왕관 완전 제거(y<84) 후 균일 배율 0.74 + 순수 하늘색 통일)
        Bitmap hbkRaw = LoadCleanNaiPart(System.IO.Path.Combine(npDir, "v2_hair_back_r2_2684746856.png"));
        for (int y = 0; y < 86; y++)
            for (int x = 0; x < hbkRaw.Width; x++)
            {
                Color c = hbkRaw.GetPixel(x, y);
                if (!IsPureGreen(c) && (c.R > c.B + 8 || y < 80)) hbkRaw.SetPixel(x, y, CHROMA);
            }
        DefringeAndSpecks(hbkRaw, 150, true);
        Bitmap hairBack = TransformUniform(hbkRaw, 0.74);
        hbkRaw.Dispose();
        MatchSkyBlueTone(hairBack, 174, 205, 236, false);

        // 4 & 5. face_neutral (v2_face_neutral_2508140970, 균일 배율 0.44, head_base와 피부 RGB 일치 + face_blink 동일 마스크)
        Bitmap fnRaw = LoadCleanNaiPart(System.IO.Path.Combine(npDir, "v2_face_neutral_2508140970.png"));
        Bitmap faceNeutral = TransformUniform(fnRaw, 0.44);
        fnRaw.Dispose();
        MatchSkinTone(faceNeutral, 253, 235, 221);
        DefringeAndSpecks(faceNeutral, 150, true);

        Bitmap faceBlink = new Bitmap(faceNeutral);
        Rectangle fr = GetBounds(faceBlink);
        Color lidCol = Color.FromArgb(253, 235, 221);
        int eyMin = fr.Y + (int)(fr.Height * 0.34);
        int eyMax = fr.Y + (int)(fr.Height * 0.75);
        for (int y = eyMin; y <= eyMax; y++)
        {
            for (int x = fr.X + 4; x < fr.Right - 4; x++)
            {
                bool inL = (x >= fr.X + (int)(fr.Width * 0.08) && x <= fr.X + (int)(fr.Width * 0.48));
                bool inR = (x >= fr.X + (int)(fr.Width * 0.52) && x <= fr.X + (int)(fr.Width * 0.96));
                if ((inL || inR) && !IsPureGreen(faceBlink.GetPixel(x, y)))
                    faceBlink.SetPixel(x, y, lidCol);
            }
        }
        using (Graphics g = Graphics.FromImage(faceBlink))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using (Pen lash = new Pen(Color.FromArgb(24, 18, 22), 3.4f))
            {
                lash.StartCap = LineCap.Round; lash.EndCap = LineCap.Round;
                float ly = fr.Y + fr.Height * 0.58f;
                g.DrawCurve(lash, new PointF[] {
                    new PointF(fr.X + fr.Width * 0.19f, ly - 3),
                    new PointF(fr.X + fr.Width * 0.31f, ly + 4),
                    new PointF(fr.X + fr.Width * 0.43f, ly - 1)
                }, 0.6f);
                g.DrawCurve(lash, new PointF[] {
                    new PointF(fr.X + fr.Width * 0.58f, ly - 1),
                    new PointF(fr.X + fr.Width * 0.72f, ly + 4),
                    new PointF(fr.X + fr.Width * 0.85f, ly - 4)
                }, 0.6f);
            }
        }
        for (int y = 0; y < faceNeutral.Height; y++)
            for (int x = 0; x < faceNeutral.Width; x++)
                if (IsPureGreen(faceNeutral.GetPixel(x, y))) faceBlink.SetPixel(x, y, CHROMA);

        // 6. torso (v2_torso_1414283939, 단일 균일 배율 0.62 -> 2.5등신 상체 높이 맞춰 치마 프릴 노출)
        Bitmap trRaw = LoadCleanNaiPart(System.IO.Path.Combine(npDir, "v2_torso_1414283939.png"));
        Bitmap torso = TransformUniform(trRaw, 0.62);
        trRaw.Dispose();
        MatchSkyBlueTone(torso, 189, 219, 246, true);

        // 7. lower (v2_lower_r2_2017718683, 단일 균일 배율 0.96 + 코트 하늘색 + 허리 무테)
        Bitmap lwRaw = LoadCleanNaiPart(System.IO.Path.Combine(npDir, "v2_lower_r2_2017718683.png"));
        Bitmap lower = TransformUniform(lwRaw, 0.96);
        lwRaw.Dispose();
        MatchSkyBlueTone(lower, 189, 219, 246, true);
        RemoveBoundaryOutline(lower, true, 5);

        // 8. skirt_back (v2_skirt_back_2811881809, 단일 균일 배율 0.62 + 위쪽 무테 + 뒷면 하늘색)
        Bitmap sbRaw = LoadCleanNaiPart(System.IO.Path.Combine(npDir, "v2_skirt_back_2811881809.png"));
        Rectangle sbr = GetBounds(sbRaw);
        for (int y = sbr.Y; y < sbr.Y + 6; y++)
            for (int x = 0; x < sbRaw.Width; x++)
                if (!IsPureGreen(sbRaw.GetPixel(x, y))) sbRaw.SetPixel(x, y, CHROMA);
        RemoveBoundaryOutline(sbRaw, true, 6);
        Bitmap skirtBack = TransformUniform(sbRaw, 0.62);
        sbRaw.Dispose();
        MatchSkyBlueTone(skirtBack, 165, 198, 232, true);

        // 9. arm_near (v2_arm_near_r3_3554570035, 단일 균일 배율 0.44 + 소매색 통일)
        Bitmap anRaw = LoadCleanNaiPart(System.IO.Path.Combine(npDir, "v2_arm_near_r3_3554570035.png"));
        Bitmap armNear = TransformUniform(anRaw, 0.44);
        anRaw.Dispose();
        MatchSkyBlueTone(armNear, 189, 219, 246, true);
        RemoveBoundaryOutline(armNear, true, 4);

        // 10. arm_far (v2_arm_far_r3_2217001132, 3차 선별본: 단일 균일 배율 0.50 + 소매색 통일 + 어깨 무테)
        Bitmap afRaw = LoadCleanNaiPart(System.IO.Path.Combine(npDir, "v2_arm_far_r3_2217001132.png"));
        Bitmap armFar = TransformUniform(afRaw, 0.50, -5.0);
        afRaw.Dispose();
        MatchSkyBlueTone(armFar, 189, 219, 246, true);
        RemoveBoundaryOutline(armFar, true, 5);

        // 11. weapon_main (v2_weapon_main_r2_2547761913, 단일 균일 배율 0.88 + 반시계 -18도 회전해 c00 -45도 각도 맞춤)
        Bitmap wpRaw = LoadCleanNaiPart(System.IO.Path.Combine(npDir, "v2_weapon_main_r2_2547761913.png"));
        Bitmap weaponMain = TransformUniform(wpRaw, 0.88, -18.0);
        wpRaw.Dispose();

        Console.WriteLine(string.Format("V2 Part sizes: head_base={0}x{1}, hair_front={2}x{3}, hair_back={4}x{5}, face_neutral={6}x{7}, face_blink={8}x{9}",
            headBase.Width, headBase.Height, hairFront.Width, hairFront.Height, hairBack.Width, hairBack.Height,
            faceNeutral.Width, faceNeutral.Height, faceBlink.Width, faceBlink.Height));
        Console.WriteLine(string.Format("V2 Part sizes: torso={0}x{1}, lower={2}x{3}, skirt_back={4}x{5}, arm_near={6}x{7}, arm_far={8}x{9}, weapon_main={10}x{11}",
            torso.Width, torso.Height, lower.Width, lower.Height, skirtBack.Width, skirtBack.Height,
            armNear.Width, armNear.Height, armFar.Width, armFar.Height, weaponMain.Width, weaponMain.Height));

        // === 시트 3장 조립 (간격 >= 60px, 읽는 순서 왼->오 / 위->아래) ===
        // Sheet 1: 1행 head_base, hair_front, hair_back / 2행 face_neutral, face_blink
        Bitmap sheet1 = NewGreenCanvas(1024, 1024);
        BlitTransparent(sheet1, headBase, 65, 110);
        BlitTransparent(sheet1, hairFront, 330, 60);
        BlitTransparent(sheet1, hairBack, 690, 60);
        BlitTransparent(sheet1, faceNeutral, 210, 600);
        BlitTransparent(sheet1, faceBlink, 600, 600);
        DefringeAndSpecks(sheet1, 150, false);
        sheet1.Save(System.IO.Path.Combine(outDir, "sheet1_head.png"), ImageFormat.Png);

        // Sheet 2: 1행 torso, lower, skirt_back / 2행 arm_near, arm_far
        Bitmap sheet2 = NewGreenCanvas(1024, 1024);
        BlitTransparent(sheet2, torso, 65, 95);
        BlitTransparent(sheet2, lower, 385, 75);
        BlitTransparent(sheet2, skirtBack, 725, 145);
        BlitTransparent(sheet2, armNear, 200, 600);
        BlitTransparent(sheet2, armFar, 620, 580);
        DefringeAndSpecks(sheet2, 150, false);
        sheet2.Save(System.IO.Path.Combine(outDir, "sheet2_body_arms.png"), ImageFormat.Png);

        // Sheet 3: weapon_main 중앙 배치
        Bitmap sheet3 = NewGreenCanvas(1024, 1024);
        BlitTransparent(sheet3, weaponMain, (1024 - weaponMain.Width) / 2, (1024 - weaponMain.Height) / 2);
        DefringeAndSpecks(sheet3, 150, false);
        sheet3.Save(System.IO.Path.Combine(outDir, "sheet3_weapons.png"), ImageFormat.Png);

        // === 재조립 검증 이미지 (scratch/cecilia_25h_reassembled.png) ===
        // 기준 중심 x=506, 머리 topY=180..462, 털깃 y=455, 발바닥 footY=880
        Bitmap reasm = NewGreenCanvas(1024, 1024);
        int headTop = 180;
        int lowerY = 880 - lower.Height;
        int torsoY = 456;
        BlitTransparent(reasm, hairBack, 514 - hairBack.Width / 2 + 10, headTop + 72);
        BlitTransparent(reasm, skirtBack, 502 - skirtBack.Width / 2, lowerY + 12);
        BlitTransparent(reasm, lower, 504 - lower.Width / 2, lowerY);
        BlitTransparent(reasm, armFar, 558, torsoY + 60);
        BlitTransparent(reasm, weaponMain, 200, torsoY + 150);
        BlitTransparent(reasm, armNear, 342, torsoY + 52);
        BlitTransparent(reasm, torso, 504 - torso.Width / 2 + 8, torsoY);
        BlitTransparent(reasm, headBase, 506 - (int)(headBase.Width * 0.58), headTop + 34);
        BlitTransparent(reasm, faceNeutral, 502 - faceNeutral.Width / 2 + 2, headTop + 104);
        BlitTransparent(reasm, hairFront, 508 - hairFront.Width / 2, headTop);
        reasm.Save(System.IO.Path.Combine(scratchDir, "cecilia_25h_reassembled.png"), ImageFormat.Png);

        // === 정량 차이 계산 (c00_complete.png 대비 구멍 / 삐져나옴 픽셀 수) ===
        int holePx = 0, spillPx = 0, c00Fg = 0, reFg = 0;
        int hHead=0, hTorso=0, hLower=0, hArmWand=0;
        int sHead=0, sTorso=0, sLower=0, sArmWand=0;
        for (int y = 0; y < 1024; y++)
            for (int x = 0; x < 1024; x++)
            {
                bool fgC = !IsPureGreen(c00.GetPixel(x, y));
                bool fgR = !IsPureGreen(reasm.GetPixel(x, y));
                if (fgC) c00Fg++;
                if (fgR) reFg++;
                if (fgC && !fgR)
                {
                    holePx++;
                    if (y < 465) hHead++;
                    else if (x < 405) hArmWand++;
                    else if (y < 660) hTorso++;
                    else hLower++;
                }
                else if (!fgC && fgR)
                {
                    spillPx++;
                    if (y < 465) sHead++;
                    else if (x < 405) sArmWand++;
                    else if (y < 660) sTorso++;
                    else sLower++;
                }
            }
        Console.WriteLine(string.Format("REASSEMBLE_DIFF: c00Fg={0}, reasmFg={1}, holePx={2} (head={3}, torso={4}, lower={5}, armWand={6}), spillPx={7} (head={8}, torso={9}, lower={10}, armWand={11})",
            c00Fg, reFg, holePx, hHead, hTorso, hLower, hArmWand, spillPx, sHead, sTorso, sLower, sArmWand));

        sheet1.Dispose(); sheet2.Dispose(); sheet3.Dispose(); reasm.Dispose(); c00.Dispose();
        headBase.Dispose(); hairFront.Dispose(); hairBack.Dispose(); faceNeutral.Dispose(); faceBlink.Dispose();
        torso.Dispose(); lower.Dispose(); skirtBack.Dispose(); armNear.Dispose(); armFar.Dispose(); weaponMain.Dispose();
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$root = (Get-Location).Path
$c00Path = Join-Path $root 'test/incoming/char_cecilia/c00_complete.png'
$npDir = Join-Path $root 'test/incoming/char_cecilia/nai_parts_v2'
$outDir = Join-Path $root 'test/incoming/char_cecilia'
$scratchDir = Join-Path $root 'scratch'

[CeciliaV2SheetBuilder]::BuildAll($c00Path, $npDir, $outDir, $scratchDir)
