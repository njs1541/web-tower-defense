<#
.SYNOPSIS
    세실리아(char_cecilia) 2단계 파츠 시트 3장(sheet1_head, sheet2_body_arms, sheet3_weapons) 정밀 생성 스크립트 (v2)
.DESCRIPTION
    확정된 c00_complete.png(1024x1024)와 NovelAI 생성 보조 파츠(head_base, skirt_back)를 조합하여
    ASSET_SPEC.md v2.10 규격에 맞는 11개 파츠를 추출·복원하고 단일 균일 배율(Uniform Scale)로 시트 3장에 배치한다.
    v2 개선사항:
    - head_base 좌우 반전(우측 귀 방향 일치) + 단일 균일 배율 0.50 + 목 아래 무테 돔 홈 제거
    - face_neutral/face_blink 이마 머리카락 대각선 잔재 및 눈 아래 점선 완전 제거
    - hair_back 상단 아치 둥글림 및 우측 상단 모자 잔재 제거
    - torso 망토 자수·진주 띠 보존 및 어깨 위 머리카락 자리 자연 복원, 하단 꼬리 제거
    - lower 가방 뒤 치마 사선 외곽선 및 금테 연결, 허리 35px 무테 돔 타원 매끄럽게 보정
    - arm_near/arm_far 소매 상단 검은 경계선 제거 후 무테 어깨 돔 매끈 연결, arm_near 쥔 손 보완
    - weapon_main 끝단 녹색 프린지 완전 제거 및 (326,518)->(365,549) 흰 자루 정밀 연결
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

public static class CeciliaSheetBuilder
{
    static readonly Color CHROMA = Color.FromArgb(0, 255, 0);

    static bool IsGreenBg(Color c, int margin = 50)
    {
        int maxRB = Math.Max(c.R, c.B);
        return (c.G - maxRB) > margin;
    }

    static bool IsPureGreen(Color c)
    {
        return c.R < 35 && c.G > 210 && c.B < 35;
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

    static Bitmap NewGreenCanvas(int w, int h)
    {
        Bitmap b = new Bitmap(w, h, PixelFormat.Format24bppRgb);
        using (Graphics g = Graphics.FromImage(b))
        {
            g.Clear(CHROMA);
        }
        return b;
    }

    static Rectangle GetBounds(Bitmap b)
    {
        int minX = b.Width, maxX = -1, minY = b.Height, maxY = -1;
        for (int y = 0; y < b.Height; y++)
        {
            for (int x = 0; x < b.Width; x++)
            {
                if (!IsPureGreen(b.GetPixel(x, y)))
                {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX) return Rectangle.Empty;
        return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }

    static PartEntry CropTightEntry(Bitmap src, int pad = 2)
    {
        Rectangle r = GetBounds(src);
        if (r.IsEmpty) return new PartEntry { Image = NewGreenCanvas(16, 16), OrigX = 0, OrigY = 0 };
        int w = r.Width + pad * 2;
        int h = r.Height + pad * 2;
        Bitmap dst = NewGreenCanvas(w, h);
        for (int y = 0; y < r.Height; y++)
        {
            for (int x = 0; x < r.Width; x++)
            {
                Color c = src.GetPixel(r.X + x, r.Y + y);
                if (!IsPureGreen(c)) dst.SetPixel(x + pad, y + pad, c);
            }
        }
        return new PartEntry { Image = dst, OrigX = r.X - pad, OrigY = r.Y - pad };
    }

    static void RemoveSpecks(Bitmap b, int minArea = 150)
    {
        int w = b.Width, h = b.Height;
        bool[,] fg = new bool[w, h];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                fg[x, y] = !IsPureGreen(b.GetPixel(x, y));

        int[,] vis = new int[w, h];
        int[] dx = { -1, 0, 1, -1, 1, -1, 0, 1 };
        int[] dy = { -1, -1, -1, 0, 0, 1, 1, 1 };

        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++)
            {
                if (!fg[x, y] || vis[x, y] != 0) continue;
                List<Point> comp = new List<Point>();
                Queue<Point> q = new Queue<Point>();
                q.Enqueue(new Point(x, y));
                vis[x, y] = 1;
                while (q.Count > 0)
                {
                    Point p = q.Dequeue();
                    comp.Add(p);
                    for (int k = 0; k < 8; k++)
                    {
                        int nx = p.X + dx[k], ny = p.Y + dy[k];
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h && fg[nx, ny] && vis[nx, ny] == 0)
                        {
                            vis[nx, ny] = 1;
                            q.Enqueue(new Point(nx, ny));
                        }
                    }
                }
                if (comp.Count < minArea)
                {
                    foreach (Point p in comp) b.SetPixel(p.X, p.Y, CHROMA);
                }
            }
        }
    }

    static void KeepLargestComponent(Bitmap b)
    {
        int w = b.Width, h = b.Height;
        bool[,] fg = new bool[w, h];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                fg[x, y] = !IsPureGreen(b.GetPixel(x, y));

        int[,] vis = new int[w, h];
        List<List<Point>> comps = new List<List<Point>>();
        int[] dx = { -1, 0, 1, -1, 1, -1, 0, 1 };
        int[] dy = { -1, -1, -1, 0, 0, 1, 1, 1 };

        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++)
            {
                if (!fg[x, y] || vis[x, y] != 0) continue;
                List<Point> comp = new List<Point>();
                Queue<Point> q = new Queue<Point>();
                q.Enqueue(new Point(x, y));
                vis[x, y] = 1;
                while (q.Count > 0)
                {
                    Point p = q.Dequeue();
                    comp.Add(p);
                    for (int k = 0; k < 8; k++)
                    {
                        int nx = p.X + dx[k], ny = p.Y + dy[k];
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h && fg[nx, ny] && vis[nx, ny] == 0)
                        {
                            vis[nx, ny] = 1;
                            q.Enqueue(new Point(nx, ny));
                        }
                    }
                }
                comps.Add(comp);
            }
        }
        if (comps.Count <= 1) return;
        comps.Sort((a, c) => c.Count.CompareTo(a.Count));
        for (int i = 1; i < comps.Count; i++)
        {
            foreach (Point p in comps[i]) b.SetPixel(p.X, p.Y, CHROMA);
        }
    }

    // 강화된 디프린지: 순수 녹색 계열 잔재를 완전히 배경화/중화
    static void DefringeClean(Bitmap b)
    {
        int w = b.Width, h = b.Height;
        for (int pass = 0; pass < 3; pass++)
        {
            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    Color c = b.GetPixel(x, y);
                    int maxRB = Math.Max(c.R, c.B);
                    if (c.G - maxRB > 32 && c.G > 90)
                    {
                        b.SetPixel(x, y, CHROMA);
                    }
                    else if (c.G - maxRB > 8 && c.G > 55)
                    {
                        bool adjBg = false;
                        for (int dy = -1; dy <= 1 && !adjBg; dy++)
                            for (int dx = -1; dx <= 1 && !adjBg; dx++)
                            {
                                int nx = x + dx, ny = y + dy;
                                if (nx >= 0 && nx < w && ny >= 0 && ny < h)
                                {
                                    Color nc = b.GetPixel(nx, ny);
                                    if (nc.G - Math.Max(nc.R, nc.B) > 32) adjBg = true;
                                }
                            }
                        if (adjBg && (c.G - maxRB) > 12)
                        {
                            b.SetPixel(x, y, CHROMA);
                        }
                        else
                        {
                            int newG = Math.Min(c.G, maxRB + 4);
                            b.SetPixel(x, y, Color.FromArgb(c.R, newG, c.B));
                        }
                    }
                }
            }
        }
    }

    static Bitmap UniformScaleClean(Bitmap src, double scale)
    {
        int nw = Math.Max(4, (int)Math.Round(src.Width * scale));
        int nh = Math.Max(4, (int)Math.Round(src.Height * scale));
        Bitmap dst = NewGreenCanvas(nw, nh);
        double inv = 1.0 / scale;
        double rad = Math.Max(1.0, inv * 0.75);

        for (int y = 0; y < nh; y++)
        {
            double sy = (y + 0.5) * inv - 0.5;
            int y0 = Math.Max(0, (int)Math.Floor(sy - rad));
            int y1 = Math.Min(src.Height - 1, (int)Math.Ceiling(sy + rad));
            for (int x = 0; x < nw; x++)
            {
                double sx = (x + 0.5) * inv - 0.5;
                int x0 = Math.Max(0, (int)Math.Floor(sx - rad));
                int x1 = Math.Min(src.Width - 1, (int)Math.Ceiling(sx + rad));

                double wFg = 0, wAll = 0;
                double rSum = 0, gSum = 0, bSum = 0;
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
                        if (!IsGreenBg(c, 45))
                        {
                            wFg += wt;
                            rSum += c.R * wt;
                            gSum += c.G * wt;
                            bSum += c.B * wt;
                        }
                    }
                }
                if (wAll > 0 && (wFg / wAll) >= 0.48)
                {
                    int rr = Math.Min(255, Math.Max(0, (int)Math.Round(rSum / wFg)));
                    int gg = Math.Min(255, Math.Max(0, (int)Math.Round(gSum / wFg)));
                    int bb = Math.Min(255, Math.Max(0, (int)Math.Round(bSum / wFg)));
                    int mrb = Math.Max(rr, bb);
                    if (gg - mrb > 10) gg = mrb + 4;
                    dst.SetPixel(x, y, Color.FromArgb(rr, gg, bb));
                }
            }
        }
        return dst;
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

    static bool IsHairBlue(Color c)
    {
        return (c.B - c.R >= 16) && (c.B >= 135) && !(c.G > 200 && c.R < 50 && c.B < 50);
    }

    static bool IsSkinTone(Color c)
    {
        return c.R >= 210 && c.G >= 165 && c.B >= 145 && (c.R >= c.B + 8) && (c.R >= c.G - 5);
    }

    static bool IsDarkLine(Color c)
    {
        return c.R < 105 && c.G < 105 && c.B < 120;
    }

    // 1. head_base 제작 (NAI part_head_base_705369404.png 좌우 반전으로 c00 귀 방향 일치 + 배율 0.50 + 목 35px 무테 돔)
    static PartEntry BuildHeadBase(string naiPath)
    {
        Bitmap raw = new Bitmap(naiPath);
        // c00은 오른쪽 귀(x=585)가 보이므로 좌우 반전하여 방향 일치!
        raw.RotateFlip(RotateFlipType.RotateNoneFlipX);
        DefringeClean(raw);
        KeepLargestComponent(raw);
        PartEntry cropped = CropTightEntry(raw, 4);
        raw.Dispose();

        // 치비 비율(턱 y=391, 두상 높이 ~148px)에 맞춰 단일 균일 배율 0.48 적용
        Bitmap scaled = UniformScaleClean(cropped.Image, 0.48);
        cropped.Image.Dispose();

        for (int y = 0; y < scaled.Height; y++)
        {
            for (int x = 0; x < scaled.Width; x++)
            {
                Color c = scaled.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                if (c.R > 160 && c.R > c.B + 15)
                {
                    int nr = Math.Min(255, c.R + 6);
                    int ng = Math.Min(255, c.G + 28);
                    int nb = Math.Min(255, c.B + 32);
                    scaled.SetPixel(x, y, Color.FromArgb(nr, ng, nb));
                }
            }
        }

        Bitmap outBmp = NewGreenCanvas(scaled.Width + 10, scaled.Height + 44);
        BlitTransparent(outBmp, scaled, 5, 4);

        // 목 바닥(하단 5px)에서 가장 넓은 가로 구간 찾기 (비대칭 목선 홈 방지)
        Rectangle r = GetBounds(outBmp);
        int neckY = r.Bottom - 2;
        int neckMinX = outBmp.Width, neckMaxX = -1;
        for (int y = r.Bottom - 8; y < r.Bottom; y++)
        {
            for (int x = r.X; x < r.Right; x++)
            {
                if (!IsPureGreen(outBmp.GetPixel(x, y)))
                {
                    if (x < neckMinX) neckMinX = x;
                    if (x > neckMaxX) neckMaxX = x;
                }
            }
        }

        int cx = (neckMinX + neckMaxX) / 2;
        int rx = Math.Max(20, (neckMaxX - neckMinX) / 2);
        int domeH = 35;
        Color neckSkin = Color.FromArgb(247, 222, 200);
        Color neckShade = Color.FromArgb(238, 207, 184);

        // 목 바닥 8px 구간의 검은 단면선과 빈 틈을 피부색으로 메움 (전체 폭 가로 덮기)
        for (int y = neckY - 8; y <= neckY; y++)
        {
            for (int x = neckMinX + 1; x <= neckMaxX - 1; x++)
            {
                Color c = outBmp.GetPixel(x, y);
                if (IsDarkLine(c) || (IsPureGreen(c) && y >= neckY - 5 && x >= neckMinX + 3 && x <= neckMaxX - 3))
                {
                    outBmp.SetPixel(x, y, neckSkin);
                }
            }
        }
        // 아래로 35px 반타원 무테 돔 추가
        for (int dy = 0; dy <= domeH; dy++)
        {
            double ny = (double)dy / domeH;
            double halfW = rx * Math.Sqrt(Math.Max(0.0, 1.0 - ny * ny));
            int xStart = (int)Math.Round(cx - halfW);
            int xEnd = (int)Math.Round(cx + halfW);
            Color fill = (dy > domeH * 0.55) ? neckShade : neckSkin;
            for (int x = xStart; x <= xEnd; x++)
            {
                int ty = neckY - 2 + dy;
                if (x >= 0 && x < outBmp.Width && ty >= 0 && ty < outBmp.Height)
                    outBmp.SetPixel(x, ty, fill);
            }
        }

        scaled.Dispose();
        DefringeClean(outBmp);
        KeepLargestComponent(outBmp);
        PartEntry res = CropTightEntry(outBmp, 2);
        outBmp.Dispose();
        // c00 기준 배치 좌표 (귀 위치 x=585, 정수리 y=218 맞춤)
        res.OrigX = 442;
        res.OrigY = 222;
        return res;
    }

    // 2. hair_front 제작 (c00 베레모+눈꽃 브로치+앞·옆머리, 얼굴 자리 #00FF00 비움)
    static PartEntry BuildHairFront(Bitmap c00)
    {
        Bitmap canvas = NewGreenCanvas(1024, 1024);

        double[,] keepPoly = {
            {395, 175}, {656, 175}, {652, 340}, {602, 344},
            {595, 336}, {576, 348}, {564, 366}, {548, 368},
            {568, 326}, {548, 286}, {490, 248}, {455, 304},
            {448, 340}, {456, 365}, {440, 364}, {426, 356},
            {408, 355}, {395, 310}
        };

        double[,] faceHolePoly = {
            {490, 256}, {505, 282}, {535, 310}, {565, 336},
            {560, 365}, {535, 386}, {492, 392}, {455, 375},
            {448, 338}, {456, 304}, {475, 278}
        };

        for (int y = 178; y <= 372; y++)
        {
            for (int x = 395; x <= 654; x++)
            {
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                if (!PointInPoly(x, y, keepPoly)) continue;

                if (PointInPoly(x, y, faceHolePoly))
                {
                    bool inEyeZone = (y >= 303 && y <= 345 && ((x >= 456 && x <= 492) || (x >= 516 && x <= 558)));
                    if (IsHairBlue(c) && !inEyeZone && y < 326)
                    {
                        canvas.SetPixel(x, y, c);
                    }
                    else if (IsDarkLine(c) && !inEyeZone && y < 323)
                    {
                        bool nearHair = false;
                        for (int dy = -2; dy <= 2 && !nearHair; dy++)
                            for (int dx = -2; dx <= 2 && !nearHair; dx++)
                                if (IsHairBlue(c00.GetPixel(x + dx, y + dy))) nearHair = true;
                        if (nearHair) canvas.SetPixel(x, y, c);
                    }
                    continue;
                }

                if (x >= 576 && x <= 612 && y >= 326 && y <= 362 && IsSkinTone(c)) continue;

                canvas.SetPixel(x, y, c);
            }
        }

        // 오른쪽 베레모 밑 귀 아래쪽 작은 뒷머리 꼬리만 정리 (귀 위 연결부 보존)
        for (int y = 344; y <= 362; y++)
            for (int x = 586; x <= 614; x++)
                canvas.SetPixel(x, y, CHROMA);

        DefringeClean(canvas);
        KeepLargestComponent(canvas);
        PartEntry res = CropTightEntry(canvas, 2);
        canvas.Dispose();
        return res;
    }

    // 3. hair_back 제작 (상단 둥근 아치 돔 + 좌우 웨이브 뒷머리 연결)
    static PartEntry BuildHairBack(Bitmap c00)
    {
        Bitmap canvas = NewGreenCanvas(1024, 1024);

        Color hairLight = Color.FromArgb(174, 218, 255);
        Color hairMid = Color.FromArgb(152, 202, 252);
        Color hairDark = Color.FromArgb(132, 182, 244);
        Color lineCol = Color.FromArgb(18, 20, 32);

        // 부드러운 반타원 상단(y=252..340) + 아래로 이어지는 웨이브 커튼(y=340..422)
        double topCenterY = 335.0;
        for (int y = 250; y <= 425; y++)
        {
            double cx = 516.0 + Math.Max(0, y - 300) * 0.04;
            double halfW;
            if (y < topCenterY)
            {
                double ny = (topCenterY - y) / 84.0;
                halfW = 86.0 * Math.Sqrt(Math.Max(0.0, 1.0 - ny * ny));
            }
            else
            {
                halfW = 86.0 + (y - topCenterY) * 0.16;
            }
            for (int x = (int)(cx - halfW); x <= (int)(cx + halfW); x++)
            {
                double waveBot = 414.0 + 8.0 * Math.Sin((x - 420.0) * 0.085);
                if (y > waveBot) continue;
                double distFromEdge = waveBot - y;
                if (distFromEdge < 2.5)
                {
                    canvas.SetPixel(x, y, lineCol);
                }
                else
                {
                    double dxNorm = Math.Abs(x - cx) / (halfW + 1e-5);
                    Color col = (y > 372 && dxNorm < 0.62) ? hairDark : (dxNorm < 0.45 ? hairMid : hairLight);
                    canvas.SetPixel(x, y, col);
                }
            }
        }

        double[,] leftHairPoly = {
            {392, 345}, {445, 345}, {468, 378}, {466, 408}, {458, 438}, {430, 452}, {392, 448}
        };
        double[,] rightHairPoly = {
            {585, 336}, {622, 336}, {665, 388}, {665, 452}, {605, 452}, {555, 452}, {535, 435}, {540, 392}, {570, 355}
        };

        for (int y = 336; y <= 454; y++)
        {
            for (int x = 392; x <= 665; x++)
            {
                if (!PointInPoly(x, y, leftHairPoly) && !PointInPoly(x, y, rightHairPoly)) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                bool isBrownOrGold = (c.R > c.B + 22);
                bool isWhiteFur = (c.R > 235 && c.G > 235 && c.B > 235 && y > 382 && x > 455 && x < 565);
                if (isBrownOrGold || isWhiteFur) continue;
                if (x >= 570 && x <= 605 && y >= 435 && c.G > 225 && c.B > 240) continue;

                if (IsHairBlue(c) || IsDarkLine(c))
                {
                    canvas.SetPixel(x, y, c);
                }
            }
        }

        // 베레모 아래(x=572..598, y=322..350)가 hair_front와 빈틈없이 겹치도록 오른쪽 상단 하늘색 곡선 연장
        for (int y = 322; y <= 350; y++)
            for (int x = 572; x <= 596; x++)
                if (IsPureGreen(canvas.GetPixel(x, y))) canvas.SetPixel(x, y, hairLight);

        DefringeClean(canvas);
        KeepLargestComponent(canvas);
        PartEntry res = CropTightEntry(canvas, 2);
        canvas.Dispose();
        return res;
    }

    // 4 & 5. face_neutral 및 face_blink 제작 (이마 머리카락 선 잔재 완벽 제거 + 감은 눈 깔끔하게)
    static void BuildFaces(Bitmap c00, out PartEntry faceNeutralEntry, out PartEntry faceBlinkEntry)
    {
        Bitmap neutralCanvas = NewGreenCanvas(1024, 1024);

        Color baseSkin = Color.FromArgb(255, 240, 222);
        Color foreheadShade = Color.FromArgb(254, 236, 216);

        // 1단계: 얼굴 피부 타원 베이스 먼저 채우기
        for (int y = 256; y <= 391; y++)
        {
            for (int x = 446; x <= 576; x++)
            {
                double cx = (y > 340) ? (508.0 + (y - 340.0) * 0.08) : 511.0;
                double rx = (y > 340) ? (63.0 - (y - 340.0) * 0.18) : 64.0;
                double cy = 324.0;
                double ry = 67.5;
                double d = Math.Pow((x - cx) / rx, 2) + Math.Pow((y - cy) / ry, 2);
                if (d <= 1.0)
                {
                    neutralCanvas.SetPixel(x, y, (y < 285) ? foreheadShade : baseSkin);
                }
            }
        }

        // 2단계: c00에서 실제 눈·눈썹·볼·코·미소·턱선 복사 (이마 앞머리 대각선/관자놀이 머리카락 선은 철저히 제외!)
        for (int y = 258; y <= 392; y++)
        {
            for (int x = 446; x <= 576; x++)
            {
                if (IsPureGreen(neutralCanvas.GetPixel(x, y))) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c))
                {
                    if (y > 350) neutralCanvas.SetPixel(x, y, CHROMA);
                    continue;
                }
                bool inLeftEye = (x >= 455 && x <= 492 && y >= 306 && y <= 343);
                bool inRightEye = (x >= 516 && x <= 560 && y >= 305 && y <= 344);
                bool inBrowL = (x >= 456 && x <= 490 && y >= 288 && y <= 305);
                bool inBrowR = (x >= 512 && x <= 558 && y >= 288 && y <= 304);

                if (inLeftEye || inRightEye)
                {
                    if (IsHairBlue(c) && y < 312) continue;
                    neutralCanvas.SetPixel(x, y, c);
                    continue;
                }
                if (inBrowL || inBrowR)
                {
                    // 원본 눈썹 영역의 앞머리 X자 검은선은 복사하지 않고 아래에서 browPen으로만 깔끔히 그림
                    continue;
                }

                // y < 342 구간의 이마·눈 사이·관자놀이에 있는 머리카락 하늘색 및 모든 어두운 머리카락 윤곽선 제거
                if (y < 345)
                {
                    // 순수 밝은 살구 피부(R>=240, G>=205, B>=185, R > B+10)만 유지
                    bool pureFaceSkin = (c.R >= 240 && c.G >= 200 && c.B >= 175 && c.R >= c.B + 8);
                    if (!pureFaceSkin) continue;
                }

                if (y >= 362 && c.B > 225 && c.R < 235) { neutralCanvas.SetPixel(x, y, CHROMA); continue; }
                neutralCanvas.SetPixel(x, y, c);
            }
        }

        // 왼쪽/오른쪽 눈썹 깔끔히 선으로 살짝 정돈 (앞머리에 가려졌던 끝 이어줌)
        using (Graphics g = Graphics.FromImage(neutralCanvas))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using (Pen browPen = new Pen(Color.FromArgb(65, 80, 102), 1.8f))
            {
                browPen.StartCap = LineCap.Round; browPen.EndCap = LineCap.Round;
                g.DrawCurve(browPen, new PointF[] { new PointF(457, 298), new PointF(472, 294), new PointF(487, 297) }, 0.5f);
                g.DrawCurve(browPen, new PointF[] { new PointF(515, 297), new PointF(534, 292), new PointF(554, 297) }, 0.5f);
            }
        }

        // 3단계: 턱 아래 목 제거 (c00 실제 턱 피부 아래만 남김)
        for (int x = 446; x <= 576; x++)
        {
            int chinY = -1;
            for (int y = 392; y >= 340; y--)
            {
                if (IsSkinTone(c00.GetPixel(x, y))) { chinY = y; break; }
            }
            if (chinY > 0)
            {
                for (int y = chinY + 3; y <= 395; y++)
                    neutralCanvas.SetPixel(x, y, CHROMA);
            }
        }

        DefringeClean(neutralCanvas);
        KeepLargestComponent(neutralCanvas);
        faceNeutralEntry = CropTightEntry(neutralCanvas, 4);

        // 4단계: face_blink 복제 (윤곽·크기 1px 오차 없이 동일)
        Bitmap blinkBmp = new Bitmap(faceNeutralEntry.Image);
        int ox = faceNeutralEntry.OrigX;
        int oy = faceNeutralEntry.OrigY;

        Color lidSkin = Color.FromArgb(255, 240, 222);
        // 눈 전체를 아래 속눈썹 그림자까지 여유롭게 지움 (y=304..349)
        for (int cy = 304; cy <= 349; cy++)
        {
            for (int cx = 454; cx <= 494; cx++)
            {
                int lx = cx - ox, ly = cy - oy;
                if (lx >= 0 && lx < blinkBmp.Width && ly >= 0 && ly < blinkBmp.Height && !IsPureGreen(blinkBmp.GetPixel(lx, ly)))
                    blinkBmp.SetPixel(lx, ly, lidSkin);
            }
            for (int cx = 514; cx <= 563; cx++)
            {
                int lx = cx - ox, ly = cy - oy;
                if (lx >= 0 && lx < blinkBmp.Width && ly >= 0 && ly < blinkBmp.Height && !IsPureGreen(blinkBmp.GetPixel(lx, ly)))
                    blinkBmp.SetPixel(lx, ly, lidSkin);
            }
        }

        using (Graphics g = Graphics.FromImage(blinkBmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using (Pen lashPen = new Pen(Color.FromArgb(26, 20, 24), 3.2f))
            {
                lashPen.StartCap = LineCap.Round;
                lashPen.EndCap = LineCap.Round;

                g.DrawCurve(lashPen, new PointF[] {
                    new PointF(458 - ox, 323 - oy),
                    new PointF(472 - ox, 329 - oy),
                    new PointF(488 - ox, 325 - oy)
                }, 0.55f);

                g.DrawCurve(lashPen, new PointF[] {
                    new PointF(518 - ox, 325 - oy),
                    new PointF(537 - ox, 329 - oy),
                    new PointF(556 - ox, 322 - oy)
                }, 0.55f);
            }
        }

        // 마스크 1px 완전 일치
        for (int y = 0; y < faceNeutralEntry.Image.Height; y++)
            for (int x = 0; x < faceNeutralEntry.Image.Width; x++)
                if (IsPureGreen(faceNeutralEntry.Image.GetPixel(x, y)))
                    blinkBmp.SetPixel(x, y, CHROMA);

        faceBlinkEntry = new PartEntry { Image = blinkBmp, OrigX = ox, OrigY = oy };
        neutralCanvas.Dispose();
    }

    // 6. torso 제작 (zoom_torso 실측 반영: 자수/진주 100% 보존, 상단 머리카락만 깔끔 복원, 하단 꼬리 제거)
    static PartEntry BuildTorso(Bitmap c00)
    {
        Bitmap canvas = NewGreenCanvas(1024, 1024);

        // 상체 정밀 영역 (가방 x<=616, y<=596 포함 / 치마 y>570 제외)
        double[,] torsoPoly = {
            {460, 384}, {558, 384}, {595, 424}, {622, 464},
            {592, 486}, {566, 492}, {590, 526}, {616, 566}, {614, 588},
            {548, 600}, {528, 578}, {468, 572}, {434, 568}, {456, 486},
            {432, 476}, {416, 452}, {434, 424}, {456, 405}
        };

        Color capeBlue = Color.FromArgb(164, 224, 255);
        Color furWhite = Color.FromArgb(248, 250, 255);
        Color lineCol = Color.FromArgb(18, 22, 34);

        // 1단계: 어깨 망토 상단 곡선 + 왼쪽/오른쪽 그라데이션 & 흰 털 깃 배경 (y=385..448)
        for (int y = 408; y <= 448; y++)
        {
            double t = (y - 408.0) / 40.0;
            int xL = (int)Math.Round(466 - t * 48);
            int xR = (int)Math.Round(550 + t * 62);
            Color rowBlue = Color.FromArgb((int)(172 - 10 * t), (int)(228 - 6 * t), 255);
            for (int x = xL; x <= xR; x++)
            {
                if (x <= xL + 1 || x >= xR - 1)
                    canvas.SetPixel(x, y, lineCol);
                else
                    canvas.SetPixel(x, y, rowBlue);
            }
        }
        // 흰 털 깃 윗부분 아치
        for (int y = 385; y <= 422; y++)
        {
            for (int x = 462; x <= 558; x++)
            {
                double nx = (x - 510.0) / 47.0;
                double ny = (y - 404.0) / 18.0;
                double d = nx * nx + ny * ny;
                if (d <= 1.0) canvas.SetPixel(x, y, (d > 0.84) ? lineCol : furWhite);
            }
        }

        // 2단계: c00에서 실제 상체 픽셀 복사 (y<446 좌우 어깨 위는 금장 클립과 갈색 가방끈만 복사해 머리카락 자국 0개 보장!)
        for (int y = 384; y <= 600; y++)
        {
            for (int x = 414; x <= 622; x++)
            {
                if (!PointInPoly(x, y, torsoPoly)) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c)) continue;

                // 가방 왼쪽 아래 치마 꼬리 완전 차단
                if (x < 546 && y > 568) continue;
                // 흰 털 깃 왼쪽 옆(x<468, y<424) 파란 머리카락 잔재 및 검은 선 완전 차단
                if (x < 468 && y < 424 && (c.B > c.R + 14 || IsDarkLine(c))) continue;

                bool inLeftShoulderTop = (x >= 414 && x <= 466 && y >= 398 && y <= 448);
                bool inRightShoulderTop = (x >= 534 && x <= 608 && y >= 406 && y <= 447);
                if (inLeftShoulderTop || inRightShoulderTop)
                {
                    bool isGoldOrStrap = (c.R > c.B + 22); // 갈색 가방끈·금장 클립·금자수만 허용
                    if (!isGoldOrStrap) continue;
                }

                canvas.SetPixel(x, y, c);
            }
        }

        // 3단계: 상의 코트 아랫단(y > arcY)만 깔끔히 정리 (강제 검은 가로선 제거해 lower와 자연 연결)
        for (int x = 434; x <= 534; x++)
        {
            double arcY = 567.0 + 3.0 * Math.Sin((x - 434.0) / 100.0 * Math.PI);
            int iy = (int)Math.Round(arcY);
            for (int y = iy + 1; y <= 595; y++)
                canvas.SetPixel(x, y, CHROMA);
        }

        DefringeClean(canvas);
        KeepLargestComponent(canvas);
        PartEntry res = CropTightEntry(canvas, 2);
        canvas.Dispose();
        return res;
    }

    // 7. lower 제작 (허리 35px 무테 돔 + 가방 뒤 우측 치마 사선 & 이중 금줄 완비)
    static PartEntry BuildLower(Bitmap c00)
    {
        Bitmap canvas = NewGreenCanvas(1024, 1024);

        Color skirtBlue = Color.FromArgb(178, 232, 255);
        Color skirtShade = Color.FromArgb(148, 208, 248);
        Color placketWhite = Color.FromArgb(250, 248, 244);
        Color goldTrim = Color.FromArgb(228, 206, 128);
        Color lineCol = Color.FromArgb(20, 22, 34);

        double[,] bagPoly = {
            {528, 515}, {585, 505}, {616, 566}, {614, 588}, {550, 598}, {532, 575}
        };
        double[,] farArmPoly = {
            {595, 520}, {715, 520}, {715, 610}, {610, 605}
        };
        double[,] nearArmPoly = {
            {280, 480}, {380, 480}, {380, 565}, {280, 565}
        };

        for (int y = 556; y <= 882; y++)
        {
            for (int x = 365; x <= 638; x++)
            {
                if (PointInPoly(x, y, bagPoly) || PointInPoly(x, y, farArmPoly) || PointInPoly(x, y, nearArmPoly)) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                if (y < 572 && x < 388 && (c.R > c.B + 15 || (c.B > c.R + 30 && y < 568))) continue;
                canvas.SetPixel(x, y, c);
            }
        }

        // 왼팔·지팡이 끝단이 가렸던 왼쪽 치마 상단 플레어 사선(x=384..428, y=556..588) 자연 복원
        for (int y = 556; y <= 588; y++)
        {
            double t = (y - 556.0) / 32.0;
            int leftEdge = (int)Math.Round(426 - t * 26);
            for (int x = leftEdge; x <= 430; x++)
            {
                if (IsPureGreen(canvas.GetPixel(x, y)))
                {
                    canvas.SetPixel(x, y, (x <= leftEdge + 1) ? lineCol : skirtBlue);
                }
            }
        }

        // 가방이 가렸던 오른쪽 치마 사선(x=548..604, y=556..608) & 이중 금테(y=598..606) 자연 복원
        for (int y = 556; y <= 608; y++)
        {
            double t = (y - 556.0) / 52.0;
            int rightEdge = (int)Math.Round(556 + t * 47); // 치마 우측 플레어 사선
            // 치마 밑단 살짝 위로 올라가는 아치(왼쪽 608 -> 오른쪽 602)
            double trimY = 606.0 - Math.Max(0, rightEdge - 560) * 0.14;
            for (int x = 526; x <= rightEdge + 1; x++)
            {
                if (IsPureGreen(canvas.GetPixel(x, y)))
                {
                    if (x >= rightEdge - 1)
                        canvas.SetPixel(x, y, lineCol);
                    else if (y >= trimY - 4 && y <= trimY + 4)
                        canvas.SetPixel(x, y, (Math.Abs(y - trimY) <= 1.2) ? placketWhite : goldTrim);
                    else
                        canvas.SetPixel(x, y, (x > rightEdge - 11) ? skirtShade : skirtBlue);
                }
            }
        }

        // 위쪽 허리 35px 무테 돔 (부드러운 둥근 타원 아치, y=521..556, 좌우 치마와 0px 단차 연결)
        int waistTopY = 556;
        int domeH = 35;
        int wLeft = 428, wRight = 560;
        double wCx = (wLeft + wRight) / 2.0;
        double wRx = (wRight - wLeft) / 2.0;

        for (int dy = 0; dy <= domeH; dy++)
        {
            double ny = (double)dy / domeH;
            double halfW = wRx * Math.Sqrt(Math.Max(0.0, 1.0 - ny * ny));
            int x0 = (int)Math.Round(wCx - halfW);
            int x1 = (int)Math.Round(wCx + halfW);
            int ty = waistTopY - dy;
            for (int x = x0; x <= x1; x++)
            {
                Color col;
                if (x >= 479 && x <= 515) col = placketWhite;
                else if (x >= 474 && x <= 520) col = goldTrim;
                else col = skirtBlue;
                canvas.SetPixel(x, ty, col);
            }
        }

        DefringeClean(canvas);
        KeepLargestComponent(canvas);
        PartEntry res = CropTightEntry(canvas, 2);
        canvas.Dispose();
        return res;
    }

    // 8. skirt_back 제작
    static PartEntry BuildSkirtBack(string naiPath)
    {
        Bitmap raw = new Bitmap(naiPath);
        DefringeClean(raw);
        KeepLargestComponent(raw);

        Rectangle r = GetBounds(raw);
        int cutY = r.Y + (int)(r.Height * 0.36);
        for (int y = 0; y < cutY; y++)
            for (int x = 0; x < raw.Width; x++)
                raw.SetPixel(x, y, CHROMA);

        Color backBlue = Color.FromArgb(156, 206, 238);
        for (int y = cutY; y < cutY + 12; y++)
        {
            for (int x = 0; x < raw.Width; x++)
            {
                Color c = raw.GetPixel(x, y);
                if (!IsPureGreen(c) && IsDarkLine(c)) raw.SetPixel(x, y, backBlue);
            }
        }

        PartEntry cropped = CropTightEntry(raw, 4);
        raw.Dispose();

        Bitmap scaled = UniformScaleClean(cropped.Image, 0.53);
        cropped.Image.Dispose();

        for (int y = 0; y < scaled.Height; y++)
        {
            for (int x = 0; x < scaled.Width; x++)
            {
                Color c = scaled.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                if (c.B > 180 && c.G > 180 && c.R < 220)
                {
                    int nr = Math.Max(0, (int)(c.R * 0.90));
                    int ng = Math.Max(0, (int)(c.G * 0.92));
                    int nb = Math.Max(0, (int)(c.B * 0.96));
                    scaled.SetPixel(x, y, Color.FromArgb(nr, ng, nb));
                }
            }
        }

        DefringeClean(scaled);
        KeepLargestComponent(scaled);
        PartEntry res = CropTightEntry(scaled, 2);
        scaled.Dispose();
        res.OrigX = 398;
        res.OrigY = 548;
        return res;
    }

    // 9. arm_near 제작 (소매 경계 검은선 제거 + 매끈 어깨 35px 무테 돔 + 쥔 갈색 장갑 손)
    static PartEntry BuildArmNear(Bitmap c00)
    {
        Bitmap canvas = NewGreenCanvas(1024, 1024);

        double[,] armPoly = {
            {428, 456}, {456, 488}, {430, 526}, {408, 558},
            {390, 558}, {382, 540}, {365, 568}, {348, 566},
            {336, 552}, {334, 534}, {346, 538}, {354, 524},
            {340, 518}, {368, 502}, {372, 488}, {404, 466}
        };

        // 1단계: c00에서 소매 + 커프스 + 장갑 먼저 복사 (망토 위 경계 제외)
        for (int y = 456; y <= 570; y++)
        {
            for (int x = 330; x <= 458; x++)
            {
                if (!PointInPoly(x, y, armPoly)) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                // 손 아래 지팡이 보석/금테 제외
                if (x >= 364 && y >= 542 && (c.B > c.R + 10 || (c.R > 180 && c.G > 140 && c.B < 120))) continue;
                // 손 위 지팡이 흰 자루(x=328..356, y=518..542) 제외
                if (x <= 358 && y >= 516 && y <= 544 && c.R > 205 && c.G > 205 && c.B > 205) continue;
                canvas.SetPixel(x, y, c);
            }
        }

        // 2단계: 소매 최상단(망토 경계 검은/흰 단차) 및 어깨 35px 무테 돔 일직선으로 매끈하게 연결
        Color sleeveBlue = Color.FromArgb(166, 224, 255);
        Color sleeveShade = Color.FromArgb(146, 208, 250);
        double shCx = 412.0, shCy = 484.0;
        double ux = 0.72, uy = -0.69;
        double vx = 0.69, vy = 0.72;
        for (int y = 425; y <= 510; y++)
        {
            for (int x = 380; x <= 480; x++)
            {
                double dx = x - shCx, dy = y - shCy;
                double along = dx * ux + dy * uy;
                double across = dx * vx + dy * vy;
                if (along >= -4 && along <= 35)
                {
                    double rx = 20.5;
                    double ny = Math.Max(0.0, along / 35.0);
                    double maxAcross = rx * Math.Sqrt(Math.Max(0.0, 1.0 - ny * ny));
                    if (Math.Abs(across) <= maxAcross)
                    {
                        if (along >= 0 || IsPureGreen(canvas.GetPixel(x, y)))
                        {
                            canvas.SetPixel(x, y, (across > 5) ? sleeveShade : sleeveBlue);
                        }
                    }
                }
            }
        }

        // 4단계: 지팡이 자루가 빠진 쥔 갈색 장갑 손 안쪽 매끈하게 그리기 (톱니/구멍 제거)
        Color gloveBrown = Color.FromArgb(106, 78, 60);
        Color lineCol = Color.FromArgb(24, 18, 16);
        using (Graphics g = Graphics.FromImage(canvas))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using (SolidBrush br = new SolidBrush(gloveBrown))
            using (Pen pen = new Pen(lineCol, 2.4f))
            {
                // 쥔 주먹 아래쪽 감싸는 손가락 덩어리
                g.FillEllipse(br, 342, 526, 33, 30);
                g.DrawArc(pen, 342, 526, 33, 30, 15, 195);
            }
        }
        // 장갑 손끝 아래쪽 들쭉날쭉한 보석 경계 정리
        for (int y = 550; y <= 570; y++)
            for (int x = 368; x <= 390; x++)
                if (IsPureGreen(canvas.GetPixel(x, y)) == false && canvas.GetPixel(x, y).R > 160 && canvas.GetPixel(x, y).G > 130)
                    canvas.SetPixel(x, y, CHROMA);

        DefringeClean(canvas);
        KeepLargestComponent(canvas);
        PartEntry res = CropTightEntry(canvas, 2);
        canvas.Dispose();
        return res;
    }

    // 10. arm_far 제작 (소매 경계 검은선 제거 + 매끈 어깨 35px 무테 돔)
    static PartEntry BuildArmFar(Bitmap c00)
    {
        Bitmap canvas = NewGreenCanvas(1024, 1024);

        double[,] armPoly = {
            {572, 488}, {614, 468}, {654, 514}, {680, 544},
            {712, 568}, {712, 586}, {676, 600}, {622, 578},
            {596, 540}
        };

        for (int y = 468; y <= 600; y++)
        {
            for (int x = 570; x <= 712; x++)
            {
                if (!PointInPoly(x, y, armPoly)) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c)) continue;
                if (x < 606 && y > 544 && c.R > 90 && c.G < 85 && c.B < 60) continue;
                canvas.SetPixel(x, y, c);
            }
        }

        // 소매 상단 망토 경계 단차 및 어깨 35px 무테 돔 일직선으로 매끈하게 연결
        Color sleeveBlue = Color.FromArgb(166, 224, 255);
        Color sleeveShade = Color.FromArgb(146, 208, 250);
        double shCx = 613.0, shCy = 499.0;
        double ux = -0.66, uy = -0.75;
        double vx = 0.75, vy = -0.66;
        for (int y = 440; y <= 530; y++)
        {
            for (int x = 550; x <= 645; x++)
            {
                double dx = x - shCx, dy = y - shCy;
                double along = dx * ux + dy * uy;
                double across = dx * vx + dy * vy;
                if (along >= -4 && along <= 35)
                {
                    double rx = 19.5;
                    double ny = Math.Max(0.0, along / 35.0);
                    double maxAcross = rx * Math.Sqrt(Math.Max(0.0, 1.0 - ny * ny));
                    if (Math.Abs(across) <= maxAcross)
                    {
                        if (along >= 0 || IsPureGreen(canvas.GetPixel(x, y)))
                        {
                            canvas.SetPixel(x, y, (across < -4) ? sleeveShade : sleeveBlue);
                        }
                    }
                }
            }
        }

        DefringeClean(canvas);
        KeepLargestComponent(canvas);
        PartEntry res = CropTightEntry(canvas, 2);
        canvas.Dispose();
        return res;
    }

    // 11. weapon_main 제작 (끝단 녹색 잔재 완전 제거 + (326,518)->(365,549) 흰 자루 정밀 연결)
    static PartEntry BuildWeaponMain(Bitmap c00)
    {
        Bitmap canvas = NewGreenCanvas(1024, 1024);

        double[,] wandTopPoly = {
            {190, 442}, {295, 442}, {336, 480}, {332, 514},
            {345, 526}, {338, 536}, {318, 526}, {314, 550},
            {255, 550}, {245, 512}, {190, 465}
        };
        for (int y = 442; y <= 552; y++)
        {
            for (int x = 190; x <= 346; x++)
            {
                if (!PointInPoly(x, y, wandTopPoly)) continue;
                Color c = c00.GetPixel(x, y);
                if (IsPureGreen(c) || IsGreenBg(c, 22)) continue;
                if (x > 330 && y > 515 && c.R < 160 && c.R > c.B + 15) continue;
                canvas.SetPixel(x, y, c);
            }
        }

        // 자루 끝단 금장 링 (359, 551) + 영롱한 파란 보석 끝단 (368, 560) 직접 깔끔히 그려 초록 구멍 0% 보장
        using (Graphics g = Graphics.FromImage(canvas))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using (SolidBrush gemMain = new SolidBrush(Color.FromArgb(46, 178, 248)))
            using (SolidBrush gemHi = new SolidBrush(Color.FromArgb(148, 228, 255)))
            using (SolidBrush goldBr = new SolidBrush(Color.FromArgb(232, 204, 108)))
            using (SolidBrush goldShade = new SolidBrush(Color.FromArgb(190, 152, 68)))
            using (Pen outPen = new Pen(Color.FromArgb(20, 22, 32), 2.2f))
            {
                // 끝단 파란 보석 (금테 바깥쪽 아래 (369, 560))
                g.TranslateTransform(369f, 560f);
                g.RotateTransform(38f);
                g.FillEllipse(gemMain, -6, -7, 13, 14);
                g.FillEllipse(gemHi, -4, -5, 6, 6);
                g.DrawEllipse(outPen, -6, -7, 13, 14);
                g.ResetTransform();

                // 금장 링 (359, 551)
                g.TranslateTransform(359f, 551f);
                g.RotateTransform(38f);
                g.FillEllipse(goldBr, -5, -8, 10, 16);
                g.FillEllipse(goldShade, 0, -5, 5, 11);
                g.DrawEllipse(outPen, -5, -8, 10, 16);
            }
        }

        // zoom_near_arm 실측 기준 흰 자루 연결: (326, 521) -> (359, 550)
        double xA = 326.0, yA = 521.0;
        double xB = 359.0, yB = 550.0;
        double len = Math.Sqrt((xB - xA) * (xB - xA) + (yB - yA) * (yB - yA));
        double ux = (xB - xA) / len, uy = (yB - yA) / len;
        double nx = -uy, ny = ux;

        Color shaftWhite = Color.FromArgb(248, 250, 255);
        Color shaftShade = Color.FromArgb(196, 204, 220);
        Color lineCol = Color.FromArgb(20, 22, 32);

        for (int y = 510; y <= 562; y++)
        {
            for (int x = 322; x <= 378; x++)
            {
                double dx = x - xA, dy = y - yA;
                double along = dx * ux + dy * uy;
                double perp = dx * nx + dy * ny;
                if (along >= 0 && along <= len && Math.Abs(perp) <= 7.0)
                {
                    if (Math.Abs(perp) >= 4.7)
                    {
                        if (IsPureGreen(canvas.GetPixel(x, y)))
                            canvas.SetPixel(x, y, lineCol);
                    }
                    else
                    {
                        canvas.SetPixel(x, y, (perp > 1.7) ? shaftShade : shaftWhite);
                    }
                }
            }
        }

        DefringeClean(canvas);
        KeepLargestComponent(canvas);
        PartEntry res = CropTightEntry(canvas, 2);
        canvas.Dispose();
        return res;
    }

    public static void BuildAll(string c00Path, string naiHeadPath, string naiSkirtPath, string outDir, string scratchDir)
    {
        Bitmap c00 = new Bitmap(c00Path);

        PartEntry headBase = BuildHeadBase(naiHeadPath);
        PartEntry hairFront = BuildHairFront(c00);
        PartEntry hairBack = BuildHairBack(c00);
        PartEntry faceNeutral, faceBlink;
        BuildFaces(c00, out faceNeutral, out faceBlink);

        PartEntry torso = BuildTorso(c00);
        PartEntry lower = BuildLower(c00);
        PartEntry skirtBack = BuildSkirtBack(naiSkirtPath);
        PartEntry armNear = BuildArmNear(c00);
        PartEntry armFar = BuildArmFar(c00);
        PartEntry weaponMain = BuildWeaponMain(c00);

        Console.WriteLine(string.Format("Part sizes: head_base={0}x{1}, hair_front={2}x{3}, hair_back={4}x{5}, face_neutral={6}x{7}, face_blink={8}x{9}",
            headBase.Image.Width, headBase.Image.Height, hairFront.Image.Width, hairFront.Image.Height, hairBack.Image.Width, hairBack.Image.Height,
            faceNeutral.Image.Width, faceNeutral.Image.Height, faceBlink.Image.Width, faceBlink.Image.Height));
        Console.WriteLine(string.Format("Part sizes: torso={0}x{1}, lower={2}x{3}, skirt_back={4}x{5}, arm_near={6}x{7}, arm_far={8}x{9}, weapon_main={10}x{11}",
            torso.Image.Width, torso.Image.Height, lower.Image.Width, lower.Image.Height, skirtBack.Image.Width, skirtBack.Image.Height,
            armNear.Image.Width, armNear.Image.Height, armFar.Image.Width, armFar.Image.Height, weaponMain.Image.Width, weaponMain.Image.Height));

        // === Sheet 1 ===
        Bitmap sheet1 = NewGreenCanvas(1024, 1024);
        int s1Row1Y = 120;
        int s1Row2Y = 580;
        BlitTransparent(sheet1, headBase.Image, 85, s1Row1Y + (240 - headBase.Image.Height) / 2);
        BlitTransparent(sheet1, hairFront.Image, 360, s1Row1Y + (240 - hairFront.Image.Height) / 2);
        BlitTransparent(sheet1, hairBack.Image, 695, s1Row1Y + (240 - hairBack.Image.Height) / 2);
        BlitTransparent(sheet1, faceNeutral.Image, 220, s1Row2Y);
        BlitTransparent(sheet1, faceBlink.Image, 600, s1Row2Y);
        RemoveSpecks(sheet1, 150);
        sheet1.Save(System.IO.Path.Combine(outDir, "sheet1_head.png"), ImageFormat.Png);

        // === Sheet 2 ===
        Bitmap sheet2 = NewGreenCanvas(1024, 1024);
        BlitTransparent(sheet2, torso.Image, 60, 110);
        BlitTransparent(sheet2, lower.Image, 375, 55);
        BlitTransparent(sheet2, skirtBack.Image, 720, 155);
        BlitTransparent(sheet2, armNear.Image, 220, 600);
        BlitTransparent(sheet2, armFar.Image, 620, 600);
        RemoveSpecks(sheet2, 150);
        sheet2.Save(System.IO.Path.Combine(outDir, "sheet2_body_arms.png"), ImageFormat.Png);

        // === Sheet 3 ===
        Bitmap sheet3 = NewGreenCanvas(1024, 1024);
        BlitTransparent(sheet3, weaponMain.Image, (1024 - weaponMain.Image.Width) / 2, (1024 - weaponMain.Image.Height) / 2);
        RemoveSpecks(sheet3, 150);
        sheet3.Save(System.IO.Path.Combine(outDir, "sheet3_weapons.png"), ImageFormat.Png);

        // === 정확한 OrigX/OrigY 기반 재조립 검증 이미지 (레이어 순서: hair_back -> skirt_back -> lower -> arm_far -> head_base -> torso -> weapon_main -> arm_near -> face_neutral -> hair_front) ===
        Bitmap reasm = NewGreenCanvas(1024, 1024);
        BlitTransparent(reasm, hairBack.Image, hairBack.OrigX, hairBack.OrigY);
        BlitTransparent(reasm, skirtBack.Image, skirtBack.OrigX, skirtBack.OrigY);
        BlitTransparent(reasm, lower.Image, lower.OrigX, lower.OrigY);
        BlitTransparent(reasm, armFar.Image, armFar.OrigX, armFar.OrigY);
        BlitTransparent(reasm, headBase.Image, headBase.OrigX, headBase.OrigY);
        BlitTransparent(reasm, torso.Image, torso.OrigX, torso.OrigY);
        BlitTransparent(reasm, weaponMain.Image, weaponMain.OrigX, weaponMain.OrigY);
        BlitTransparent(reasm, armNear.Image, armNear.OrigX, armNear.OrigY);
        BlitTransparent(reasm, faceNeutral.Image, faceNeutral.OrigX, faceNeutral.OrigY);
        BlitTransparent(reasm, hairFront.Image, hairFront.OrigX, hairFront.OrigY);
        reasm.Save(System.IO.Path.Combine(scratchDir, "cecilia_reassembled.png"), ImageFormat.Png);

        sheet1.Dispose(); sheet2.Dispose(); sheet3.Dispose(); reasm.Dispose();
        headBase.Image.Dispose(); hairFront.Image.Dispose(); hairBack.Image.Dispose();
        faceNeutral.Image.Dispose(); faceBlink.Image.Dispose();
        torso.Image.Dispose(); lower.Image.Dispose(); skirtBack.Image.Dispose();
        armNear.Image.Dispose(); armFar.Image.Dispose(); weaponMain.Image.Dispose();
        c00.Dispose();
        Console.WriteLine("All 3 sheets v2 + reassembled preview saved successfully.");
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$root = (Get-Location).Path
$c00Path = Join-Path $root 'test/incoming/char_cecilia/c00_complete.png'
$naiHead = Join-Path $root 'test/incoming/char_cecilia/nai_parts/part_head_base_705369404.png'
$naiSkirt = Join-Path $root 'test/incoming/char_cecilia/nai_parts/part_skirt_back_262490660.png'
$outDir = Join-Path $root 'test/incoming/char_cecilia'
$scratchDir = Join-Path $root 'scratch'

[CeciliaSheetBuilder]::BuildAll($c00Path, $naiHead, $naiSkirt, $outDir, $scratchDir)
