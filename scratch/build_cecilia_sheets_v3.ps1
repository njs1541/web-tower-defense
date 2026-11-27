<#
.SYNOPSIS
    세실리아(char_cecilia) 2.5등신 2단계 파츠 시트 3장 정밀 제작 스크립트 (REQ06 6.1절 반영, v0.55.90 r2)
.DESCRIPTION
    1차 시각 검수(cecilia_25h_v3_compare.png)에서 확인된 모든 세부 결함을 수정:
    - head_base: 이목구비 잔재 완전 제거, 깨끗한 피부 그라데이션+볼 홍조, 오른쪽 귀, 목 아래 35px 무테 돔 (재조립 시 torso 뒤 배치)
    - hair_front: 오른쪽 베레모 외곽선 보존, 얼굴 안쪽 머리카락/피부 완벽 정리
    - hair_back: 중앙 연결부 단색/세로선 제거, c00 가로 웨이브 그라데이션+머리카락 결 완성, 정지 시 바깥 삐져나옴 제거
    - face_neutral / face_blink: 왼쪽 눈 옆 하늘색 잔재 제거, 수직/주변 피부 보간으로 색 경계 0% 달성
    - torso: 상단 왼쪽 머리카락 삼각형·오른쪽 망토 위 머리 제거, 하단 금테 구멍 방지 및 무테 끝단 깔끔 마감
    - lower: 허리 위 반쪽 단추 조각 제거 및 c00 실제 행 패턴 35px 위로 연장, 가방 뒤 오른쪽 치마 깨끗이 복원
    - skirt_back: 금색 띠 없음, c00 프릴 색감 일치
    - arm_near / arm_far: 소매 외곽선 두 줄 겹침·망토/가방 조각·커프스 원형 돌출 제거, 매끈한 위팔~어깨 35px 무테 돔
    - weapon_main: 얼음 결정/금장 날개 잘림 0px 복원, 우상단 흰 커프스 조각 완전 제거
#>

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class PartEntry
{
    public Bitmap Image;
    public int OrigX;
    public int OrigY;
}

public static class CeciliaV3SheetBuilder
{
    static readonly Color CHROMA = Color.FromArgb(0, 255, 0);
    static readonly Color OUTLINE = Color.FromArgb(18, 15, 20);

    static bool IsPureGreen(Color c) { return c.R < 35 && c.G > 210 && c.B < 35; }
    static bool IsDarkLine(Color c) { return c.R < 88 && c.G < 88 && c.B < 102; }

    static Bitmap NewGreenCanvas(int w, int h)
    {
        Bitmap b = new Bitmap(w, h, PixelFormat.Format24bppRgb);
        using (Graphics g = Graphics.FromImage(b)) { g.Clear(CHROMA); }
        return b;
    }

    static bool PointInPoly(double px, double py, double[,] poly)
    {
        int n = poly.GetLength(0);
        bool inside = false;
        for (int i = 0, j = n - 1; i < n; j = i++)
        {
            double xi = poly[i, 0], yi = poly[i, 1];
            double xj = poly[j, 0], yj = poly[j, 1];
            bool intersect = ((yi > py) != (yj > py)) &&
                (px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
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

    static PartEntry CropTightEntry(Bitmap src, int pad = 2)
    {
        Rectangle r = GetBounds(src);
        if (r.IsEmpty) return new PartEntry { Image = NewGreenCanvas(16, 16), OrigX = 0, OrigY = 0 };
        int w = r.Width + pad * 2, h = r.Height + pad * 2;
        Bitmap dst = NewGreenCanvas(w, h);
        for (int y = 0; y < r.Height; y++)
            for (int x = 0; x < r.Width; x++)
            {
                Color c = src.GetPixel(r.X + x, r.Y + y);
                if (!IsPureGreen(c)) dst.SetPixel(x + pad, y + pad, c);
            }
        return new PartEntry { Image = dst, OrigX = r.X - pad, OrigY = r.Y - pad };
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
                    if (adjBg && (c.G - mrb) > 18) b.SetPixel(x, y, CHROMA);
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

    static void CompositeOverClean(Bitmap dst, Bitmap layerArgb)
    {
        int w = dst.Width, h = dst.Height;
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                Color sc = layerArgb.GetPixel(x, y);
                if (sc.A < 120) continue;
                if (sc.A >= 250)
                {
                    dst.SetPixel(x, y, Color.FromArgb(sc.R, sc.G, sc.B));
                }
                else
                {
                    Color dc = dst.GetPixel(x, y);
                    if (IsPureGreen(dc))
                    {
                        dst.SetPixel(x, y, Color.FromArgb(sc.R, sc.G, sc.B));
                    }
                    else
                    {
                        double a = sc.A / 255.0;
                        int rr = (int)Math.Round(sc.R * a + dc.R * (1 - a));
                        int gg = (int)Math.Round(sc.G * a + dc.G * (1 - a));
                        int bb = (int)Math.Round(sc.B * a + dc.B * (1 - a));
                        dst.SetPixel(x, y, Color.FromArgb(rr, gg, bb));
                    }
                }
            }
    }

    static Bitmap ExtractByPoly(Bitmap c00, double[,] poly)
    {
        Bitmap dst = NewGreenCanvas(c00.Width, c00.Height);
        for (int y = 0; y < c00.Height; y++)
            for (int x = 0; x < c00.Width; x++)
            {
                if (!PointInPoly(x + 0.5, y + 0.5, poly)) continue;
                Color c = c00.GetPixel(x, y);
                if (!IsPureGreen(c)) dst.SetPixel(x, y, c);
            }
        return dst;
    }

    static void CopyRegion(Bitmap src, Bitmap dst, double[,] poly)
    {
        for (int y = 0; y < src.Height; y++)
            for (int x = 0; x < src.Width; x++)
            {
                if (!PointInPoly(x + 0.5, y + 0.5, poly)) continue;
                Color c = src.GetPixel(x, y);
                if (!IsPureGreen(c)) dst.SetPixel(x, y, c);
            }
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

    static Color SkinToneAt(int x, int y)
    {
        // c00 실제 얼굴 피부 그라데이션 + 은은한 볼터치
        double dist = Math.Sqrt(Math.Pow((x - 486) / 76.0, 2) + Math.Pow((y - 384) / 68.0, 2));
        double t = Math.Max(0.0, Math.Min(1.0, dist));
        double r = 254 - 7 * t, g = 238 - 12 * t, b = 222 - 11 * t;
        // 양 볼 홍조(L: 432,426 / R: 540,425) 자연스럽게 반영
        double dL = Math.Sqrt(Math.Pow((x - 434) / 22.0, 2) + Math.Pow((y - 425) / 14.0, 2));
        double dR = Math.Sqrt(Math.Pow((x - 538) / 22.0, 2) + Math.Pow((y - 424) / 14.0, 2));
        double blush = Math.Max(0.0, 1.0 - Math.Min(dL, dR));
        g -= 11 * blush;
        b -= 10 * blush;
        return Color.FromArgb((int)Math.Round(r), (int)Math.Round(g), (int)Math.Round(b));
    }

    // 1. head_base: c00 턱선 윤곽 + 깨끗한 피부 두상(이목구비 잔재 0) + 화면 오른쪽 귀 + 목 아래 35px 무테 돔
    static PartEntry BuildHeadBase(Bitmap c00)
    {
        Bitmap b = NewGreenCanvas(1024, 1024);
        Bitmap layer = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(layer))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);

            // 목 아래 35px 무테 돔 (c00 턱 y=462 아래 y=454..496, x=468..516)
            using (LinearGradientBrush neckBr = new LinearGradientBrush(
                new Point(492, 452), new Point(492, 498),
                Color.FromArgb(228, 200, 186), Color.FromArgb(245, 224, 210)))
            {
                GraphicsPath neckPath = new GraphicsPath();
                neckPath.AddCurve(new PointF[] {
                    new PointF(471, 454), new PointF(470, 480), new PointF(477, 494),
                    new PointF(492, 498), new PointF(507, 494), new PointF(514, 480), new PointF(513, 454)
                }, 0.45f);
                neckPath.CloseFigure();
                g.FillPath(neckBr, neckPath);
                using (Pen neckPen = new Pen(OUTLINE, 4.0f))
                {
                    neckPen.StartCap = LineCap.Round; neckPen.EndCap = LineCap.Round;
                    g.DrawCurve(neckPen, new PointF[] { new PointF(471, 456), new PointF(470, 474), new PointF(472, 482) }, 0.3f);
                    g.DrawCurve(neckPen, new PointF[] { new PointF(513, 456), new PointF(514, 474), new PointF(512, 482) }, 0.3f);
                }
                neckPath.Dispose();
            }

            // 둥근 두상 (이목구비 없이 완전히 깨끗한 맨머리 + 오른쪽 볼/턱선 c00 일치)
            GraphicsPath headPath = new GraphicsPath();
            headPath.AddCurve(new PointF[] {
                new PointF(416, 384), new PointF(416, 336), new PointF(438, 286),
                new PointF(496, 268), new PointF(556, 284), new PointF(582, 334),
                new PointF(583, 386), new PointF(572, 424), new PointF(538, 450),
                new PointF(488, 461), new PointF(440, 449), new PointF(421, 420)
            }, 0.52f);
            headPath.CloseFigure();

            using (PathGradientBrush pgb = new PathGradientBrush(headPath))
            {
                pgb.CenterPoint = new PointF(488, 370);
                pgb.CenterColor = Color.FromArgb(254, 238, 222);
                pgb.SurroundColors = new Color[] { Color.FromArgb(247, 224, 209) };
                g.FillPath(pgb, headPath);
            }
            // 양 볼 은은한 홍조
            using (GraphicsPath blL = new GraphicsPath())
            {
                blL.AddEllipse(422, 412, 34, 24);
                using (PathGradientBrush brL = new PathGradientBrush(blL))
                {
                    brL.CenterColor = Color.FromArgb(90, 250, 195, 185);
                    brL.SurroundColors = new Color[] { Color.FromArgb(0, 254, 234, 220) };
                    g.FillPath(brL, blL);
                }
            }
            using (GraphicsPath blR = new GraphicsPath())
            {
                blR.AddEllipse(524, 410, 36, 24);
                using (PathGradientBrush brR = new PathGradientBrush(blR))
                {
                    brR.CenterColor = Color.FromArgb(90, 250, 195, 185);
                    brR.SurroundColors = new Color[] { Color.FromArgb(0, 254, 234, 220) };
                    g.FillPath(brR, blR);
                }
            }

            using (Pen headPen = new Pen(OUTLINE, 4.4f))
            {
                headPen.LineJoin = LineJoin.Round;
                g.DrawPath(headPen, headPath);
            }
            headPath.Dispose();

            // 화면 오른쪽 귀! (x=573..600, y=378..424)
            GraphicsPath earPath = new GraphicsPath();
            earPath.AddCurve(new PointF[] {
                new PointF(576, 384), new PointF(592, 378), new PointF(600, 392),
                new PointF(596, 412), new PointF(582, 422), new PointF(572, 416)
            }, 0.55f);
            using (LinearGradientBrush earBr = new LinearGradientBrush(
                new Point(572, 380), new Point(600, 422),
                Color.FromArgb(252, 233, 217), Color.FromArgb(240, 212, 198)))
            {
                g.FillPath(earBr, earPath);
            }
            using (Pen earPen = new Pen(OUTLINE, 4.0f))
            {
                earPen.StartCap = LineCap.Round; earPen.EndCap = LineCap.Round;
                g.DrawCurve(earPen, new PointF[] {
                    new PointF(576, 384), new PointF(592, 378), new PointF(600, 392),
                    new PointF(596, 412), new PointF(582, 422), new PointF(574, 416)
                }, 0.55f);
            }
            using (Pen earInPen = new Pen(Color.FromArgb(140, 95, 85), 2.4f))
            {
                earInPen.StartCap = LineCap.Round; earInPen.EndCap = LineCap.Round;
                g.DrawCurve(earInPen, new PointF[] {
                    new PointF(581, 392), new PointF(591, 391), new PointF(589, 405), new PointF(582, 408)
                }, 0.5f);
            }
            earPath.Dispose();
        }
        CompositeOverClean(b, layer);
        layer.Dispose();

        // c00의 실제 턱 외곽선 (y=424..463) 정밀 매칭 (우측 하단 흰 털깃 청백색 완전 배제!)
        for (int y = 424; y <= 464; y++)
            for (int x = 418; x <= 576; x++)
            {
                Color cur = b.GetPixel(x, y);
                if (IsPureGreen(cur)) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                if (c.B > c.R + 2) continue;
                if (y >= 438 && c.R > 220 && c.G > 218 && c.B > 214 && (c.R - c.B) < 8) continue; // 흰 털깃 배제
                if (y <= 444 && x >= 466 && x <= 506 && IsDarkLine(c)) continue;
                if (IsDarkLine(c) || (c.R > 210 && c.G > 175 && c.G < 245 && c.R > c.B + 8))
                {
                    b.SetPixel(x, y, c);
                }
            }

        DefringeAndSpecks(b, 150, true);
        return CropTightEntry(b, 2);
    }

    // 2. hair_front: c00 베레모 + 큰 눈꽃 + 앞머리 + 양쪽 앞 갈래 (얼굴 자리만 비움, 외곽선/옆머리 보존)
    static PartEntry BuildHairFront(Bitmap c00)
    {
        double[,] hairFrontOuter = {
            {495,176}, {565,182}, {622,208}, {662,250}, {684,302}, {680,354}, {654,376},
            {614,365}, {606,420}, {608,478}, {598,520}, {576,532}, {554,515}, {556,470},
            {570,415}, {574,358}, {534,315}, {486,281}, {445,315}, {424,355},
            {420,415}, {430,468}, {433,512}, {412,526}, {391,514}, {391,472},
            {382,420}, {382,360}, {383,318}, {374,295}, {378,248}, {412,204}, {455,182}
        };
        Bitmap b = ExtractByPoly(c00, hairFrontOuter);
        double[,] faceHole = {
            {486,288}, {524,322}, {552,360}, {568,402}, {566,442}, {538,458},
            {488,464}, {436,455}, {416,422}, {418,375}, {434,335}, {458,308}
        };
        for (int y = 285; y < 465; y++)
            for (int x = 412; x < 576; x++)
            {
                if (!PointInPoly(x + 0.5, y + 0.5, faceHole)) continue;
                Color c = b.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                bool nearHairEdge = (y < 355 && Math.Abs(x - (486 - (y - 281) * 0.72)) < 5.5) ||
                                    (y < 355 && Math.Abs(x - (486 + (y - 281) * 0.85)) < 5.5) ||
                                    (y >= 355 && (x <= 423 || x >= 565));
                if (!nearHairEdge)
                {
                    b.SetPixel(x, y, CHROMA);
                }
            }
        // 오른쪽 눈꼬리 속눈썹이 hair_front 안쪽(x=554..566, y=384..398)에 걸린 검은 픽셀 제거 (피부색에 닿은 안쪽 제거)
        for (int y = 380; y <= 405; y++)
            for (int x = 550; x <= 566; x++)
            {
                Color c = b.GetPixel(x, y);
                if (!IsPureGreen(c) && (IsDarkLine(c) || c.R > c.B)) b.SetPixel(x, y, CHROMA);
            }
        for (int y = 448; y < 540; y++)
            for (int x = 420; x < 575; x++)
            {
                if (x >= 434 && x <= 554) b.SetPixel(x, y, CHROMA);
            }

        DefringeAndSpecks(b, 150, true);
        return CropTightEntry(b, 2);
    }

    // 3. hair_back: c00 왼쪽/오른쪽 굵은 웨이브 뒷머리 + 자연스러운 물결 결 중앙 연결 (바깥 삐져나옴 최소화!)
    static PartEntry BuildHairBack(Bitmap c00)
    {
        Bitmap b = NewGreenCanvas(1024, 1024);

        // 중앙 연결부는 머리/베레모/몸통 실루엣 안쪽(x=392..616, y=335..556)으로 딱 맞게 잡아 정지 시 삐져나옴 0px!
        Bitmap layer = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(layer))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);

            GraphicsPath backPath = new GraphicsPath();
            backPath.AddCurve(new PointF[] {
                new PointF(394, 375),
                new PointF(425, 326),
                new PointF(510, 322),
                new PointF(595, 332),
                new PointF(630, 385),
                new PointF(635, 470),
                new PointF(612, 542),
                new PointF(568, 554),
                new PointF(515, 538),
                new PointF(465, 548),
                new PointF(412, 540),
                new PointF(385, 515),
                new PointF(384, 445)
            }, 0.5f);
            backPath.CloseFigure();

            // c00 뒷머리 색감(밝은 하늘색 하이라이트 밴드 + 중간 하늘색 + 어두운 청회색 그림자)
            using (LinearGradientBrush hairBr = new LinearGradientBrush(
                new Point(390, 330), new Point(620, 555),
                Color.FromArgb(164, 198, 232), Color.FromArgb(116, 152, 192)))
            {
                g.FillPath(hairBr, backPath);
            }

            // 수직 막대기 금지 -> 부드러운 가로 물결 하이라이트 띠 & S자 곡선 웨이브 음영!
            using (GraphicsPath waveHi = new GraphicsPath())
            {
                waveHi.AddCurve(new PointF[] {
                    new PointF(390, 445), new PointF(455, 432), new PointF(525, 446), new PointF(620, 430),
                    new PointF(625, 466), new PointF(525, 480), new PointF(455, 466), new PointF(388, 478)
                }, 0.5f);
                waveHi.CloseFigure();
                using (SolidBrush hiBr = new SolidBrush(Color.FromArgb(186, 218, 248))) { g.FillPath(hiBr, waveHi); }
            }
            using (GraphicsPath waveSh = new GraphicsPath())
            {
                waveSh.AddCurve(new PointF[] {
                    new PointF(386, 512), new PointF(460, 502), new PointF(535, 514), new PointF(618, 502),
                    new PointF(612, 542), new PointF(530, 552), new PointF(455, 546), new PointF(390, 534)
                }, 0.5f);
                waveSh.CloseFigure();
                using (SolidBrush shBr = new SolidBrush(Color.FromArgb(104, 138, 178))) { g.FillPath(shBr, waveSh); }
            }
            // S자 머리카락 결 선 (은은하게)
            using (Pen strandPen = new Pen(Color.FromArgb(72, 98, 134), 2.4f))
            {
                strandPen.StartCap = LineCap.Round; strandPen.EndCap = LineCap.Round;
                g.DrawCurve(strandPen, new PointF[] { new PointF(435, 345), new PointF(448, 410), new PointF(432, 475), new PointF(446, 536) }, 0.55f);
                g.DrawCurve(strandPen, new PointF[] { new PointF(492, 340), new PointF(508, 405), new PointF(492, 472), new PointF(508, 534) }, 0.55f);
                g.DrawCurve(strandPen, new PointF[] { new PointF(552, 345), new PointF(568, 412), new PointF(554, 478), new PointF(568, 542) }, 0.55f);
            }
            using (Pen outPen = new Pen(OUTLINE, 4.4f))
            {
                outPen.LineJoin = LineJoin.Round;
                g.DrawPath(outPen, backPath);
            }
            backPath.Dispose();
        }
        CompositeOverClean(b, layer);
        layer.Dispose();

        // c00 실제 왼쪽 뒷머리 웨이브(x=340..420, y=385..562)와 오른쪽 굵은 웨이브 뒷머리(x=572..726, y=335..570)를 100% 복사
        double[,] leftBackHair = {
            {368,405}, {398,405}, {398,485}, {424,522}, {402,556}, {360,564}, {342,542}, {344,505}, {364,485}, {350,455}, {356,425}
        };
        CopyRegion(c00, b, leftBackHair);

        // 오른쪽 웨이브: 중앙 연결부와의 수직 경계가 생기지 않도록 S자 머리카락 결(x=588..606)에 맞춰 부드럽게 이어 복사
        double[,] rightBackHair = {
            {592,355}, {654,370}, {676,348}, {688,370}, {715,435}, {728,505}, {712,550},
            {668,572}, {616,566}, {594,540}, {602,508}, {588,476}, {594,425}
        };
        CopyRegion(c00, b, rightBackHair);
        for (int y = 440; y <= 558; y++)
            for (int x = 588; x <= 622; x++)
            {
                Color c = c00.GetPixel(x, y);
                if (!IsPureGreen(c) && !(y > 480 && y < 538 && x < 606 && c.R > c.B) && c.B >= c.R) b.SetPixel(x, y, c);
            }

        DefringeAndSpecks(b, 150, true);
        return CropTightEntry(b, 2);
    }

    // 4 & 5. face_neutral & face_blink: 왼쪽 하늘색 잔재 완전 제거 + 주변 피부톤 균일 보간 + 동일 마스크
    static void BuildFaces(Bitmap c00, out PartEntry outNeutral, out PartEntry outBlink)
    {
        Bitmap b = NewGreenCanvas(1024, 1024);
        double fcx = 487.0, fcy = 390.0, frx = 72.0, fry = 61.0;

        for (int y = 327; y <= 453; y++)
            for (int x = 413; x <= 563; x++)
            {
                double dx = (x - fcx) / frx, dy = (y - fcy) / fry;
                if (dx * dx + dy * dy > 1.0) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                if ((y > 436 && (x < 442 || x > 540)) || (y > 410 && (x < 420 || x > 560))) continue;

                // 기본은 c00 실제 얼굴 피부/이목구비 그대로 쓰되,
                // 이마 머리카락(y<354) 및 왼쪽 눈 옆 머리카락 하늘색(B > R - 6 또는 어두운 회청색)만 SkinToneAt으로 부드럽게 대체!
                bool inLeftEye = (x >= 418 && x <= 459 && y >= 352 && y <= 423);
                bool inRightEye = (x >= 500 && x <= 557 && y >= 350 && y <= 422);
                bool inBrows = ((x >= 420 && x <= 454 && y >= 335 && y <= 350) || (x >= 503 && x <= 550 && y >= 333 && y <= 349));

                if (!inLeftEye && !inRightEye && !inBrows)
                {
                    // 파란색/청회색(머리카락) 또는 눈썹/눈 밖의 어두운 픽셀(가르마/턱선)은 피부로 교체
                    bool isBlue = (c.B > c.R - 5) || (c.R < 236 && c.B >= c.R - 14 && y < 378);
                    bool isMouth = (x >= 468 && x <= 503 && y >= 430 && y <= 445);
                    if (isBlue || (!isMouth && (IsDarkLine(c) || c.R < 226)))
                    {
                        b.SetPixel(x, y, SkinToneAt(x, y));
                        continue;
                    }
                }
                // 왼쪽 눈 왼쪽 바깥쪽(x <= 423)에 혹시 하늘색이 붙었으면 피부로 교체
                if (x <= 424 && (c.B > c.R - 3 && !IsDarkLine(c)))
                {
                    b.SetPixel(x, y, SkinToneAt(x, y));
                    continue;
                }
                b.SetPixel(x, y, c);
            }

        DefringeAndSpecks(b, 150, true);
        outNeutral = CropTightEntry(b, 2);

        // face_blink: 100% 동일 마스크 복사 후 양쪽 눈 영역만 깨끗한 SkinToneAt으로 채움 (속눈썹 잔재 세로선 0%!)
        Bitmap blinkFull = new Bitmap(b);
        for (int x = 415; x <= 562; x++)
        {
            int yStart = (x < 480) ? 352 : 350;
            int yEnd = (x < 480) ? 424 : 423;
            bool inLCol = (x >= 416 && x <= 461);
            bool inRCol = (x >= 498 && x <= 559);
            if (!inLCol && !inRCol) continue;
            for (int y = yStart; y <= yEnd; y++)
            {
                if (IsPureGreen(blinkFull.GetPixel(x, y))) continue;
                blinkFull.SetPixel(x, y, SkinToneAt(x, y));
            }
        }

        Bitmap layer = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(layer))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);
            using (Pen lashPen = new Pen(OUTLINE, 4.6f))
            {
                lashPen.StartCap = LineCap.Round; lashPen.EndCap = LineCap.Round;
                g.DrawCurve(lashPen, new PointF[] { new PointF(420, 392), new PointF(438, 404), new PointF(456, 396) }, 0.55f);
                g.DrawCurve(lashPen, new PointF[] { new PointF(504, 394), new PointF(528, 403), new PointF(554, 391) }, 0.55f);
            }
            using (Pen tipPen = new Pen(OUTLINE, 3.0f))
            {
                tipPen.StartCap = LineCap.Round; tipPen.EndCap = LineCap.Round;
                g.DrawLine(tipPen, 422, 393, 415, 386);
                g.DrawLine(tipPen, 552, 392, 560, 384);
            }
        }
        for (int y = 0; y < 1024; y++)
            for (int x = 0; x < 1024; x++)
            {
                if (IsPureGreen(b.GetPixel(x, y))) continue;
                Color sc = layer.GetPixel(x, y);
                if (sc.A >= 110) blinkFull.SetPixel(x, y, Color.FromArgb(sc.R, sc.G, sc.B));
            }
        layer.Dispose();

        Rectangle rN = GetBounds(b);
        Bitmap blinkCrop = NewGreenCanvas(outNeutral.Image.Width, outNeutral.Image.Height);
        for (int y = 0; y < rN.Height; y++)
            for (int x = 0; x < rN.Width; x++)
            {
                Color c = blinkFull.GetPixel(rN.X + x, rN.Y + y);
                if (!IsPureGreen(c)) blinkCrop.SetPixel(x + 2, y + 2, c);
            }
        outBlink = new PartEntry { Image = blinkCrop, OrigX = outNeutral.OrigX, OrigY = outNeutral.OrigY };
        b.Dispose(); blinkFull.Dispose();
    }

    // 6. torso: 털깃 위 머리카락 삼각형 제거 + 오른쪽 망토 위 머리카락 제거 + 하단 금테/코트 유지 무테 끝단
    static PartEntry BuildTorso(Bitmap c00)
    {
        Bitmap b = NewGreenCanvas(1024, 1024);

        Bitmap layer = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(layer))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);

            // 상체 코트 몸판: 상단 털깃 아래(y>=488)부터 하단(y<=642)까지만 채워 위쪽 사각 틈 및 하단 가로 띠 방지!
            GraphicsPath bodyPath = new GraphicsPath();
            bodyPath.AddCurve(new PointF[] {
                new PointF(445, 490), new PointF(424, 522), new PointF(422, 565),
                new PointF(410, 622), new PointF(416, 642), new PointF(492, 644),
                new PointF(568, 640), new PointF(576, 595), new PointF(568, 535), new PointF(542, 490)
            }, 0.45f);
            bodyPath.CloseFigure();
            using (LinearGradientBrush coatBr = new LinearGradientBrush(
                new Point(408, 500), new Point(578, 640),
                Color.FromArgb(182, 211, 244), Color.FromArgb(158, 189, 226)))
            {
                g.FillPath(coatBr, bodyPath);
            }
            using (Pen sidePen = new Pen(OUTLINE, 4.2f))
            {
                sidePen.StartCap = LineCap.Round; sidePen.EndCap = LineCap.Round;
                g.DrawCurve(sidePen, new PointF[] { new PointF(430, 518), new PointF(424, 558), new PointF(414, 615), new PointF(410, 640) }, 0.4f);
                g.DrawCurve(sidePen, new PointF[] { new PointF(562, 515), new PointF(571, 556), new PointF(575, 608), new PointF(572, 636) }, 0.4f);
            }
            bodyPath.Dispose();

            using (SolidBrush capeBr = new SolidBrush(Color.FromArgb(182, 211, 244)))
            {
                GraphicsPath capeL = new GraphicsPath();
                capeL.AddPolygon(new PointF[] {
                    new PointF(445, 488), new PointF(408, 496), new PointF(394, 520), new PointF(425, 538), new PointF(465, 512)
                });
                g.FillPath(capeBr, capeL); capeL.Dispose();

                GraphicsPath capeR = new GraphicsPath();
                capeR.AddPolygon(new PointF[] {
                    new PointF(542, 488), new PointF(588, 496), new PointF(604, 518), new PointF(582, 536), new PointF(535, 516)
                });
                g.FillPath(capeBr, capeR); capeR.Dispose();
            }
            using (Pen capePen = new Pen(OUTLINE, 4.2f))
            {
                capePen.StartCap = LineCap.Round; capePen.EndCap = LineCap.Round;
                g.DrawCurve(capePen, new PointF[] { new PointF(444, 486), new PointF(412, 496), new PointF(395, 521), new PointF(424, 537) }, 0.45f);
                g.DrawCurve(capePen, new PointF[] { new PointF(542, 486), new PointF(578, 494), new PointF(603, 518), new PointF(582, 535) }, 0.45f);
            }
            using (Pen whiteTrim = new Pen(Color.FromArgb(245, 245, 240), 4.0f))
            using (Pen goldTrim = new Pen(Color.FromArgb(196, 168, 108), 2.0f))
            {
                g.DrawCurve(whiteTrim, new PointF[] { new PointF(398, 518), new PointF(424, 532), new PointF(460, 508) }, 0.4f);
                g.DrawCurve(goldTrim, new PointF[] { new PointF(401, 514), new PointF(424, 527), new PointF(458, 504) }, 0.4f);
                g.DrawCurve(whiteTrim, new PointF[] { new PointF(536, 516), new PointF(578, 530), new PointF(600, 516) }, 0.4f);
                g.DrawCurve(goldTrim, new PointF[] { new PointF(538, 512), new PointF(577, 525), new PointF(597, 513) }, 0.4f);
            }
        }
        CompositeOverClean(b, layer);
        layer.Dispose();

        // c00에서 실제 상체 복사 (상단 왼쪽/오른쪽 옆머리 겹침 영역 제외!)
        double[,] torsoPoly = {
            {446,456}, {488,464}, {546,454}, {550,486},
            {595,500}, {602,522}, {574,540}, {566,574},
            {592,592}, {594,634}, {570,652}, {534,648},
            {518,645}, {492,646}, {434,646}, {412,640},
            {422,596}, {434,552}, {436,522}, {404,528},
            {402,502}, {440,480}
        };
        for (int y = 452; y <= 650; y++)
            for (int x = 398; x <= 604; x++)
            {
                if (!PointInPoly(x + 0.5, y + 0.5, torsoPoly)) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                // 털깃 왼쪽(x<=448, y<=492): 순수 흰 깃(R>210 && B>200)과 깃 외곽 검은선(x>=441)만 남기고 옆머리 파란 삼각형 제거!
                if (x <= 445 && y <= 526 && !(c.R > 210 && c.G > 205 && c.B > 200) && !(x >= 440 && y <= 490 && IsDarkLine(c))) continue;
                if (x >= 548 && y <= 526) continue;
                b.SetPixel(x, y, c);
            }
        // 털깃 좌/우 바깥 모서리에 남은 미세한 직각 파란 점 정리 (y=452..490, x<441 or x>547)
        for (int y = 452; y <= 488; y++)
            for (int x = 430; x <= 555; x++)
            {
                if (x <= 440 || x >= 548)
                {
                    Color c = b.GetPixel(x, y);
                    if (!IsPureGreen(c) && (c.B > c.R + 10)) b.SetPixel(x, y, CHROMA);
                }
            }
        // 왼쪽 흰 털깃 위 검은 외곽선 살짝 정리 (머리카락과 붙은 상단 좌측 x=436..448, y=456..490은 털깃 외곽으로 연결)
        // 단, 하단 흰 앞판·금테(y=640..652)는 절대 지우지 않고 그대로 유지!

        DefringeAndSpecks(b, 150, true);
        return CropTightEntry(b, 2);
    }

    // 7. lower: 허리 위 반쪽 단추 없이 실제 c00 y=616 행 패턴 그대로 35px 위로 연장 + 가방 뒤 오른쪽 치마 복원
    static PartEntry BuildLower(Bitmap c00)
    {
        Bitmap b = NewGreenCanvas(1024, 1024);

        // 먼저 612..680 영역에서 가방 뒤 오른쪽 치마 채움 + y=616 실제 행(단추 없는 허리 높이) 패턴으로 35px 허리 돔(y=582..616) 연장!
        // 실제 c00에서 y=616..622 평균 가로 라인을 보면: x=422..437 코트파랑, x=438..444 금테, x=445..520 흰앞판, x=521..527 금테, x=528..564 코트파랑
        for (int y = 582; y <= 616; y++)
        {
            double shrink = (616 - y) * 0.22; // 위로 올라갈수록 살짝 좁아짐
            int leftEdge = (int)Math.Round(420 + shrink);
            int rightEdge = (int)Math.Round(564 - shrink);
            // 아치형 상단 둥글기
            double normX = ((double)leftEdge + rightEdge) / 2.0;
            for (int x = leftEdge; x <= rightEdge; x++)
            {
                double u = Math.Abs(x - normX) / Math.Max(1.0, (rightEdge - leftEdge) / 2.0);
                double domeTop = 582 + 18 * u * u;
                if (y < domeTop) continue;
                double goldL = 439 + shrink * 0.2;
                double goldR = 523 - shrink * 0.2;
                if (Math.Abs(x - goldL) <= 2.6 || Math.Abs(x - goldR) <= 2.6)
                    b.SetPixel(x, y, Color.FromArgb(172, 144, 92));
                else if (x > goldL + 2.6 && x < goldR - 2.6)
                    b.SetPixel(x, y, Color.FromArgb(245, 245, 241));
                else
                    b.SetPixel(x, y, Color.FromArgb(174, 204, 238));
            }
        }

        // 가방 뒤 오른쪽 치마 채우기 (y=616..685, x=522..594) + 좌우 외곽선
        Bitmap layer = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(layer))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);
            GraphicsPath rSkirt = new GraphicsPath();
            rSkirt.AddPolygon(new PointF[] {
                new PointF(524, 616), new PointF(564, 616), new PointF(594, 668), new PointF(578, 686), new PointF(522, 682)
            });
            using (LinearGradientBrush skBr = new LinearGradientBrush(
                new Point(522, 616), new Point(594, 684),
                Color.FromArgb(172, 202, 236), Color.FromArgb(148, 178, 218)))
            {
                g.FillPath(skBr, rSkirt);
            }
            rSkirt.Dispose();

            using (Pen outPen = new Pen(OUTLINE, 4.4f))
            {
                outPen.StartCap = LineCap.Round; outPen.EndCap = LineCap.Round;
                g.DrawCurve(outPen, new PointF[] { new PointF(563, 614), new PointF(579, 642), new PointF(595, 668) }, 0.4f);
                g.DrawCurve(outPen, new PointF[] { new PointF(420, 614), new PointF(404, 644), new PointF(391, 672) }, 0.4f);
            }
        }
        CompositeOverClean(b, layer);
        layer.Dispose();

        // c00에서 실제 하체(y=616..882, 단추 아래부터!) 원본 그대로 복사 (가방과 왼쪽 소매 끝만 제외)
        double[,] bagCutPoly = {
            {533,596}, {568,580}, {598,610}, {598,648}, {568,656}, {532,640}
        };
        double[,] leftSleeveCut = {
            {340,580}, {416,580}, {410,636}, {388,668}, {340,668}
        };
        for (int y = 616; y <= 882; y++)
            for (int x = 384; x <= 604; x++)
            {
                if (y < 658 && PointInPoly(x + 0.5, y + 0.5, bagCutPoly)) continue;
                if (y < 668 && PointInPoly(x + 0.5, y + 0.5, leftSleeveCut)) continue;
                Color c = c00.GetPixel(x, y);
                if (!IsPureGreen(c)) b.SetPixel(x, y, c);
            }

        DefringeAndSpecks(b, 150, true);
        return CropTightEntry(b, 2);
    }

    // 8. skirt_back: 금색 띠 없음! c00 앞자락 프릴 밝은 색감 일치, 위쪽 무테 돔
    static PartEntry BuildSkirtBack()
    {
        Bitmap b = NewGreenCanvas(1024, 1024);
        Bitmap layer = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(layer))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);

            GraphicsPath frill = new GraphicsPath();
            frill.AddCurve(new PointF[] {
                new PointF(396, 672), new PointF(406, 692), new PointF(435, 702),
                new PointF(468, 707), new PointF(500, 708), new PointF(534, 706),
                new PointF(568, 698), new PointF(588, 682), new PointF(590, 668), new PointF(492, 660)
            }, 0.4f);
            frill.CloseFigure();
            using (LinearGradientBrush frBr = new LinearGradientBrush(
                new Point(400, 665), new Point(580, 708),
                Color.FromArgb(242, 245, 250), Color.FromArgb(212, 222, 236)))
            {
                g.FillPath(frBr, frill);
            }
            using (Pen outPen = new Pen(OUTLINE, 4.0f))
            {
                outPen.LineJoin = LineJoin.Round;
                g.DrawPath(outPen, frill);
            }
            frill.Dispose();

            using (Pen foldPen = new Pen(Color.FromArgb(148, 162, 184), 2.0f))
            {
                for (int x = 420; x <= 565; x += 22)
                    g.DrawLine(foldPen, x, 678, x + (x - 492) / 14, 702);
            }

            GraphicsPath backCloth = new GraphicsPath();
            backCloth.AddCurve(new PointF[] {
                new PointF(416, 618), new PointF(492, 606), new PointF(568, 618),
                new PointF(592, 668), new PointF(540, 686), new PointF(492, 690),
                new PointF(438, 685), new PointF(394, 670)
            }, 0.4f);
            backCloth.CloseFigure();
            using (LinearGradientBrush bkBr = new LinearGradientBrush(
                new Point(400, 610), new Point(585, 690),
                Color.FromArgb(148, 178, 214), Color.FromArgb(120, 152, 194)))
            {
                g.FillPath(bkBr, backCloth);
            }
            using (Pen cPen = new Pen(OUTLINE, 4.0f))
            {
                cPen.StartCap = LineCap.Round; cPen.EndCap = LineCap.Round;
                g.DrawCurve(cPen, new PointF[] {
                    new PointF(414, 622), new PointF(394, 670), new PointF(438, 685),
                    new PointF(492, 690), new PointF(540, 686), new PointF(592, 668), new PointF(570, 622)
                }, 0.4f);
            }
            backCloth.Dispose();
        }
        CompositeOverClean(b, layer);
        layer.Dispose();
        DefringeAndSpecks(b, 150, true);
        return CropTightEntry(b, 2);
    }

    // 9. arm_near: 화면 왼쪽 오른팔 — 이중 외곽선/망토 조각 제거, 실제 소매(y>=538)에 맞춰 매끈한 위팔~어깨 35px 무테 돔 연결!
    static PartEntry BuildArmNear(Bitmap c00)
    {
        Bitmap b = NewGreenCanvas(1024, 1024);

        Bitmap layer = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(layer))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);

            // 소매 실제 경계선: 바깥 (356,592)-(392,544) -> (412,516)-(424,500) / 안쪽 (414,590)-(428,546) -> (436,512)-(434,498)
            GraphicsPath upperArm = new GraphicsPath();
            upperArm.AddCurve(new PointF[] {
                new PointF(356, 592), new PointF(392, 544), new PointF(412, 512),
                new PointF(426, 496), new PointF(438, 504), new PointF(434, 535),
                new PointF(418, 592)
            }, 0.42f);
            upperArm.CloseFigure();

            using (LinearGradientBrush armBr = new LinearGradientBrush(
                new Point(365, 575), new Point(436, 515),
                Color.FromArgb(186, 214, 245), Color.FromArgb(160, 190, 226)))
            {
                g.FillPath(armBr, upperArm);
            }
            // 양옆 4px 검은 외곽선 (맨 위 둥근 어깨 끝만 무테!)
            using (Pen outPen = new Pen(OUTLINE, 4.2f))
            {
                outPen.StartCap = LineCap.Round; outPen.EndCap = LineCap.Round;
                g.DrawCurve(outPen, new PointF[] { new PointF(356, 592), new PointF(392, 544), new PointF(414, 508) }, 0.35f);
                g.DrawCurve(outPen, new PointF[] { new PointF(416, 592), new PointF(428, 546), new PointF(438, 512) }, 0.35f);
            }
            upperArm.Dispose();
        }
        CompositeOverClean(b, layer);
        layer.Dispose();

        // c00에서 망토 아래쪽(y>=538) 순수 팔(소매+커프스+손)만 복사! (망토 518..538 조각 완벽히 배제!)
        double[,] armNearLowerPoly = {
            {388,542}, {430,536}, {424,572}, {412,626}, {390,656}, {365,666}, {346,646}, {342,598}
        };
        for (int y = 536; y <= 668; y++)
            for (int x = 340; x <= 434; x++)
            {
                if (!PointInPoly(x + 0.5, y + 0.5, armNearLowerPoly)) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                bool isWandBit = (y >= 626 && x >= 364 && (c.R > 165 && c.G > 130 && c.B < 120));
                if (isWandBit) continue;
                b.SetPixel(x, y, c);
            }

        // 장갑 손바닥 지팡이 자국 자연스럽게 마감
        Bitmap handLayer = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(handLayer))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);
            GraphicsPath glovePalm = new GraphicsPath();
            glovePalm.AddCurve(new PointF[] {
                new PointF(352, 628), new PointF(378, 625), new PointF(388, 642),
                new PointF(380, 660), new PointF(362, 662), new PointF(350, 646)
            }, 0.5f);
            glovePalm.CloseFigure();
            using (LinearGradientBrush glBr = new LinearGradientBrush(
                new Point(352, 626), new Point(386, 660),
                Color.FromArgb(128, 70, 58), Color.FromArgb(92, 46, 40)))
            {
                g.FillPath(glBr, glovePalm);
            }
            using (Pen knucklePen = new Pen(Color.FromArgb(62, 28, 25), 2.4f))
            {
                knucklePen.StartCap = LineCap.Round; knucklePen.EndCap = LineCap.Round;
                g.DrawCurve(knucklePen, new PointF[] { new PointF(366, 636), new PointF(376, 644), new PointF(372, 654) }, 0.4f);
                g.DrawLine(knucklePen, 361, 648, 368, 657);
            }
            using (Pen glOut = new Pen(OUTLINE, 3.8f))
            {
                glOut.StartCap = LineCap.Round; glOut.EndCap = LineCap.Round;
                g.DrawCurve(glOut, new PointF[] {
                    new PointF(378, 625), new PointF(388, 642), new PointF(380, 660), new PointF(362, 662), new PointF(350, 648)
                }, 0.5f);
            }
            glovePalm.Dispose();
        }
        for (int y = 623; y <= 665; y++)
            for (int x = 358; x <= 392; x++)
            {
                Color cur = b.GetPixel(x, y);
                Color hc = handLayer.GetPixel(x, y);
                if (hc.A >= 120 && (IsPureGreen(cur) || (x >= 364 && y >= 626)))
                    b.SetPixel(x, y, Color.FromArgb(hc.R, hc.G, hc.B));
            }
        handLayer.Dispose();

        DefringeAndSpecks(b, 150, true);
        return CropTightEntry(b, 2);
    }

    // 10. arm_far: 화면 오른쪽 왼팔 — 이중선/망토·가방 조각/둥근 돌출 제거, 매끈한 위팔~어깨 35px 무테 돔 연결!
    static PartEntry BuildArmFar(Bitmap c00)
    {
        Bitmap b = NewGreenCanvas(1024, 1024);

        Bitmap layer = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(layer))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);

            // 실제 소매 접선: 안쪽 (588,596)-(576,554)->(568,512) / 바깥쪽 (636,592)-(614,548)->(596,512)
            GraphicsPath upperArm = new GraphicsPath();
            upperArm.AddCurve(new PointF[] {
                new PointF(586, 598), new PointF(575, 554), new PointF(568, 514),
                new PointF(578, 496), new PointF(592, 498), new PointF(602, 522),
                new PointF(642, 592)
            }, 0.42f);
            upperArm.CloseFigure();

            using (LinearGradientBrush armBr = new LinearGradientBrush(
                new Point(570, 510), new Point(635, 585),
                Color.FromArgb(164, 196, 232), Color.FromArgb(182, 212, 244)))
            {
                g.FillPath(armBr, upperArm);
            }
            using (Pen outPen = new Pen(OUTLINE, 4.2f))
            {
                outPen.StartCap = LineCap.Round; outPen.EndCap = LineCap.Round;
                g.DrawCurve(outPen, new PointF[] { new PointF(568, 512), new PointF(575, 554), new PointF(588, 600) }, 0.35f);
                g.DrawCurve(outPen, new PointF[] { new PointF(598, 514), new PointF(618, 550), new PointF(642, 592) }, 0.35f);
            }
            upperArm.Dispose();

            // 가방 뒤 털 커프스 왼쪽 부드러운 흰/금 곡선 연결 (각진 모서리 없이 실제 커프스 곡률 일치)
            GraphicsPath cuffPatch = new GraphicsPath();
            cuffPatch.AddCurve(new PointF[] {
                new PointF(586, 608), new PointF(612, 598), new PointF(612, 636), new PointF(588, 634), new PointF(584, 622)
            }, 0.55f);
            cuffPatch.CloseFigure();
            using (SolidBrush wBr = new SolidBrush(Color.FromArgb(245, 245, 242))) { g.FillPath(wBr, cuffPatch); }
            using (Pen goldTrim = new Pen(Color.FromArgb(196, 168, 108), 3.0f))
            {
                g.DrawLine(goldTrim, 586, 608, 610, 598);
            }
            using (Pen cOut = new Pen(OUTLINE, 4.0f))
            {
                cOut.StartCap = LineCap.Round; cOut.EndCap = LineCap.Round;
                g.DrawCurve(cOut, new PointF[] { new PointF(587, 604), new PointF(584, 620), new PointF(590, 634) }, 0.45f);
            }
            cuffPatch.Dispose();
        }
        CompositeOverClean(b, layer);
        layer.Dispose();

        // c00에서 망토 아래(y>=540) 순수 팔(소매+커프스+손)만 복사! 가방(x<=594, y<=636) 제외!
        double[,] armFarLowerPoly = {
            {575,542}, {616,540}, {656,596}, {660,664}, {642,682}, {606,668}, {586,638}
        };
        for (int y = 540; y <= 684; y++)
            for (int x = 574; x <= 664; x++)
            {
                if (!PointInPoly(x + 0.5, y + 0.5, armFarLowerPoly)) continue;
                if (x <= 595 && y >= 578 && y <= 638) continue;
                Color c = c00.GetPixel(x, y);
                if (!IsPureGreen(c)) b.SetPixel(x, y, c);
            }

        DefringeAndSpecks(b, 150, true);
        return CropTightEntry(b, 2);
    }

    // 11. weapon_main: c00 얼음 결정 + 금장 100% 무손실 보존 (날개 잘림 0px!) + 우상단 커프스 흰 조각 제거 + 자루 끝 캡 완성
    static PartEntry BuildWeaponMain(Bitmap c00)
    {
        Bitmap b = NewGreenCanvas(1024, 1024);

        // 충분한 여유 폭의 폴리곤으로 왼쪽/오른쪽 결정 날개 전부 포함, 단 x >= 352 && y <= 650 우상단은 흰 커프스·손 찌꺼기 원천 차단을 위해 x >= 362 제외 후 ARGB 레이어로 자루/구슬만 깔끔히 그림!
        double[,] wandPoly = {
            {185,860}, {185,820}, {248,690}, {322,638}, {365,625}, {375,655}, {358,760}, {280,828}, {215,860}
        };
        for (int y = 620; y <= 860; y++)
            for (int x = 185; x <= 375; x++)
            {
                if (!PointInPoly(x + 0.5, y + 0.5, wandPoly)) continue;
                // 우상단 손·흰 커프스 겹침 구간(x >= 364 && y <= 652)만 제외해 금장 자루 밑동과 끊김 없이 직결!
                if (x >= 364 && y <= 652) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                if (x >= 348 && y <= 664 && c.R > 72 && c.G < 72 && c.B < 65) continue;
                if (x >= 352 && y <= 654 && (c.R > 195 && c.G > 195 && c.B > 195)) continue;
                b.SetPixel(x, y, c);
            }

        Bitmap layer = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(layer))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);

            // 실제 자루 축 (349, 662) -> (382, 634) 방향 일치시켜 틈 없이 완벽 연결!
            using (Pen shaftOut = new Pen(OUTLINE, 11.0f))
            using (Pen shaftMid = new Pen(Color.FromArgb(148, 114, 72), 6.0f))
            using (Pen shaftHi = new Pen(Color.FromArgb(204, 172, 108), 2.5f))
            {
                shaftOut.StartCap = LineCap.Round; shaftOut.EndCap = LineCap.Round;
                shaftMid.StartCap = LineCap.Round; shaftMid.EndCap = LineCap.Round;
                shaftHi.StartCap = LineCap.Round; shaftHi.EndCap = LineCap.Round;
                g.DrawLine(shaftOut, 349, 662, 382, 634);
                g.DrawLine(shaftMid, 349, 662, 382, 634);
                g.DrawLine(shaftHi, 349, 660, 381, 633);
            }
            using (SolidBrush outBr = new SolidBrush(OUTLINE))
            using (SolidBrush goldBr = new SolidBrush(Color.FromArgb(212, 178, 106)))
            using (SolidBrush hiBr = new SolidBrush(Color.FromArgb(245, 224, 158)))
            {
                g.FillEllipse(outBr, 374, 624, 17, 17);
                g.FillEllipse(goldBr, 377, 627, 11, 11);
                g.FillEllipse(hiBr, 379, 629, 5, 5);
            }
        }
        for (int y = 620; y <= 666; y++)
            for (int x = 345; x <= 394; x++)
            {
                Color hc = layer.GetPixel(x, y);
                if (hc.A >= 120 && (IsPureGreen(b.GetPixel(x, y)) || x >= 354))
                    b.SetPixel(x, y, Color.FromArgb(hc.R, hc.G, hc.B));
            }
        layer.Dispose();

        DefringeAndSpecks(b, 150, true);
        return CropTightEntry(b, 2);
    }

    public static void BuildAll(string c00Path, string outDir, string scratchDir)
    {
        Bitmap c00 = new Bitmap(c00Path);

        PartEntry headBase = BuildHeadBase(c00);
        PartEntry hairFront = BuildHairFront(c00);
        PartEntry hairBack = BuildHairBack(c00);
        PartEntry faceNeutral, faceBlink;
        BuildFaces(c00, out faceNeutral, out faceBlink);

        PartEntry torso = BuildTorso(c00);
        PartEntry lower = BuildLower(c00);
        PartEntry skirtBack = BuildSkirtBack();
        PartEntry armNear = BuildArmNear(c00);
        PartEntry armFar = BuildArmFar(c00);
        PartEntry weaponMain = BuildWeaponMain(c00);

        Console.WriteLine(string.Format("V3r2 Part sizes: head_base={0}x{1}, hair_front={2}x{3}, hair_back={4}x{5}, face_neutral={6}x{7}, face_blink={8}x{9}",
            headBase.Image.Width, headBase.Image.Height, hairFront.Image.Width, hairFront.Image.Height,
            hairBack.Image.Width, hairBack.Image.Height, faceNeutral.Image.Width, faceNeutral.Image.Height,
            faceBlink.Image.Width, faceBlink.Image.Height));
        Console.WriteLine(string.Format("V3r2 Part sizes: torso={0}x{1}, lower={2}x{3}, skirt_back={4}x{5}, arm_near={6}x{7}, arm_far={8}x{9}, weapon_main={10}x{11}",
            torso.Image.Width, torso.Image.Height, lower.Image.Width, lower.Image.Height,
            skirtBack.Image.Width, skirtBack.Image.Height, armNear.Image.Width, armNear.Image.Height,
            armFar.Image.Width, armFar.Image.Height, weaponMain.Image.Width, weaponMain.Image.Height));

        // === 시트 3장 조립 ===
        Bitmap sheet1 = NewGreenCanvas(1024, 1024);
        BlitTransparent(sheet1, headBase.Image, 45, 130);
        BlitTransparent(sheet1, hairFront.Image, 290, 60);
        BlitTransparent(sheet1, hairBack.Image, 625, 100);
        BlitTransparent(sheet1, faceNeutral.Image, 230, 600);
        BlitTransparent(sheet1, faceBlink.Image, 600, 600);
        DefringeAndSpecks(sheet1, 150, false);
        sheet1.Save(System.IO.Path.Combine(outDir, "sheet1_head.png"), ImageFormat.Png);

        Bitmap sheet2 = NewGreenCanvas(1024, 1024);
        BlitTransparent(sheet2, torso.Image, 55, 130);
        BlitTransparent(sheet2, lower.Image, 360, 80);
        BlitTransparent(sheet2, skirtBack.Image, 700, 175);
        BlitTransparent(sheet2, armNear.Image, 240, 600);
        BlitTransparent(sheet2, armFar.Image, 620, 580);
        DefringeAndSpecks(sheet2, 150, false);
        sheet2.Save(System.IO.Path.Combine(outDir, "sheet2_body_arms.png"), ImageFormat.Png);

        Bitmap sheet3 = NewGreenCanvas(1024, 1024);
        BlitTransparent(sheet3, weaponMain.Image, (1024 - weaponMain.Image.Width) / 2, (1024 - weaponMain.Image.Height) / 2);
        DefringeAndSpecks(sheet3, 150, false);
        sheet3.Save(System.IO.Path.Combine(outDir, "sheet3_weapons.png"), ImageFormat.Png);

        // === 재조립 검증 (정확한 Z-Order: hair_back -> skirt_back -> lower -> arm_far -> weapon_main -> arm_near -> head_base -> torso(깃이 목 밑을 덮음!) -> face_neutral -> hair_front) ===
        Bitmap reasm = NewGreenCanvas(1024, 1024);
        BlitTransparent(reasm, hairBack.Image, hairBack.OrigX, hairBack.OrigY);
        BlitTransparent(reasm, skirtBack.Image, 392, 606);
        BlitTransparent(reasm, lower.Image, lower.OrigX, lower.OrigY);
        BlitTransparent(reasm, armFar.Image, armFar.OrigX, armFar.OrigY);
        BlitTransparent(reasm, weaponMain.Image, weaponMain.OrigX, weaponMain.OrigY);
        BlitTransparent(reasm, armNear.Image, armNear.OrigX, armNear.OrigY);
        BlitTransparent(reasm, headBase.Image, headBase.OrigX, headBase.OrigY);
        BlitTransparent(reasm, torso.Image, torso.OrigX, torso.OrigY);
        // 단 face_neutral과 hair_front가 torso 위를 살짝 덮는 옆머리까지 제대로 얹힘 (턱/볼은 torso 털깃 뒤지만 얼굴 이목구비는 위)
        // 실제 c00에서 털깃(y>=454)이 턱 끝(y=462) 바로 밑 일부를 덮고(y=452..464) 턱선은 털깃 위 또는 뒤
        // 2절: head_base 목 돔은 상체 깃 밑으로 -> torso 그린 후 턱/얼굴(head_base 위 y<=462)은 face_neutral + hair_front로 덮음
        BlitTransparent(reasm, faceNeutral.Image, faceNeutral.OrigX, faceNeutral.OrigY);
        BlitTransparent(reasm, hairFront.Image, hairFront.OrigX, hairFront.OrigY);
        reasm.Save(System.IO.Path.Combine(scratchDir, "cecilia_25h_v3_reassembled.png"), ImageFormat.Png);

        int c00Fg = 0, reFg = 0, holePx = 0, spillPx = 0;
        int hHead=0, hTorso=0, hLower=0, hArmWand=0;
        int sHead=0, sTorso=0, sLower=0, sArmWand=0;
        Bitmap diffBmp = new Bitmap(1024, 1024, PixelFormat.Format24bppRgb);
        for (int y = 0; y < 1024; y++)
            for (int x = 0; x < 1024; x++)
            {
                Color cc = c00.GetPixel(x, y);
                Color cr = reasm.GetPixel(x, y);
                bool fgC = !IsPureGreen(cc);
                bool fgR = !IsPureGreen(cr);
                if (fgC) c00Fg++;
                if (fgR) reFg++;
                if (fgC && !fgR)
                {
                    holePx++;
                    diffBmp.SetPixel(x, y, Color.FromArgb(255, 40, 40));
                    if (y < 465) hHead++;
                    else if (x < 405) hArmWand++;
                    else if (y < 660) hTorso++;
                    else hLower++;
                }
                else if (!fgC && fgR)
                {
                    spillPx++;
                    diffBmp.SetPixel(x, y, Color.FromArgb(40, 120, 255));
                    if (y < 465) sHead++;
                    else if (x < 405) sArmWand++;
                    else if (y < 660) sTorso++;
                    else sLower++;
                }
                else if (fgC && fgR)
                {
                    diffBmp.SetPixel(x, y, Color.FromArgb(180 + cc.R / 4, 180 + cc.G / 4, 180 + cc.B / 4));
                }
                else
                {
                    diffBmp.SetPixel(x, y, CHROMA);
                }
            }
        double holePct = c00Fg > 0 ? (100.0 * holePx / c00Fg) : 0;
        double spillPct = c00Fg > 0 ? (100.0 * spillPx / c00Fg) : 0;
        Console.WriteLine(string.Format("REASSEMBLE_DIFF: c00Fg={0}, reasmFg={1}, holePx={2} ({3:F2}%, head={4}, torso={5}, lower={6}, armWand={7}), spillPx={8} ({9:F2}%, head={10}, torso={11}, lower={12}, armWand={13})",
            c00Fg, reFg, holePx, holePct, hHead, hTorso, hLower, hArmWand, spillPx, spillPct, sHead, sTorso, sLower, sArmWand));

        Bitmap compare = NewGreenCanvas(1800, 760);
        using (Graphics g = Graphics.FromImage(compare))
        {
            g.Clear(Color.FromArgb(24, 28, 36));
            Rectangle srcCrop = new Rectangle(170, 165, 580, 730);
            g.DrawImage(c00, new Rectangle(15, 20, 580, 730), srcCrop, GraphicsUnit.Pixel);
            g.DrawImage(reasm, new Rectangle(610, 20, 580, 730), srcCrop, GraphicsUnit.Pixel);
            g.DrawImage(diffBmp, new Rectangle(1205, 20, 580, 730), srcCrop, GraphicsUnit.Pixel);
            using (Font f = new Font("Consolas", 14, FontStyle.Bold))
            using (SolidBrush br = new SolidBrush(Color.White))
            {
                g.DrawString("c00_complete (Ref)", f, br, 25, 4);
                g.DrawString("V3 r2 Reassembled", f, br, 620, 4);
                g.DrawString(string.Format("Diff: Hole(Red)={0}px ({1:F2}%) | Spill(Blue)={2}px ({3:F2}%)", holePx, holePct, spillPx, spillPct), f, br, 1215, 4);
            }
        }
        compare.Save(System.IO.Path.Combine(scratchDir, "cecilia_25h_v3_compare.png"), ImageFormat.Png);

        diffBmp.Dispose(); compare.Dispose();
        sheet1.Dispose(); sheet2.Dispose(); sheet3.Dispose(); reasm.Dispose(); c00.Dispose();
        headBase.Image.Dispose(); hairFront.Image.Dispose(); hairBack.Image.Dispose();
        faceNeutral.Image.Dispose(); faceBlink.Image.Dispose();
        torso.Image.Dispose(); lower.Image.Dispose(); skirtBack.Image.Dispose();
        armNear.Image.Dispose(); armFar.Image.Dispose(); weaponMain.Image.Dispose();
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$root = (Get-Location).Path
$c00Path = Join-Path $root 'test/incoming/char_cecilia/c00_complete.png'
$outDir = Join-Path $root 'test/incoming/char_cecilia'
$scratchDir = Join-Path $root 'scratch'

[CeciliaV3SheetBuilder]::BuildAll($c00Path, $outDir, $scratchDir)
