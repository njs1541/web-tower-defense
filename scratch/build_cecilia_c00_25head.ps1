<#
.SYNOPSIS
    세실리아(char_cecilia) 2차 2번(c00_25h_v2_3979162304.png)을 2.5등신 기준선(y=180..880, x=512)에 단일 균일 배율로 정렬·정화하여 c00_complete.png 생성
#>

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class CeciliaC00Aligner
{
    static bool IsGreen(byte[] dpx, int idx) { return dpx[idx + 2] < 10 && dpx[idx + 1] > 245 && dpx[idx] < 10; }

    public static void Build(string srcPath, string outPath, string guidePath)
    {
        Bitmap src = new Bitmap(srcPath);
        int sw = src.Width, sh = src.Height;
        BitmapData sbd = src.LockBits(new Rectangle(0, 0, sw, sh), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        byte[] spx = new byte[sw * sh * 4];
        Marshal.Copy(sbd.Scan0, spx, 0, spx.Length);
        src.UnlockBits(sbd);

        // 1) 외곽 모서리 4곳에서 시작하는 크로마키 배경 Flood-Fill
        bool[] bg = new bool[sw * sh];
        Queue<int> q = new Queue<int>();
        int[] seeds = { 0, sw - 1, (sh - 1) * sw, sw * sh - 1 };
        foreach (int s in seeds) { bg[s] = true; q.Enqueue(s); }
        int[] dx = { -1, 1, 0, 0 };
        int[] dy = { 0, 0, -1, 1 };
        while (q.Count > 0)
        {
            int cur = q.Dequeue();
            int cx = cur % sw, cy = cur / sw;
            for (int k = 0; k < 4; k++)
            {
                int nx = cx + dx[k], ny = cy + dy[k];
                if (nx < 0 || nx >= sw || ny < 0 || ny >= sh) continue;
                int np = ny * sw + nx;
                if (bg[np]) continue;
                int pi = np * 4;
                byte pr = spx[pi + 2], pg = spx[pi + 1], pb = spx[pi];
                if (pg > 160 && pb < 115 && (pg - pb) > 90 && (pg - pr) > 35)
                {
                    bg[np] = true;
                    q.Enqueue(np);
                }
            }
        }
        // 고립된 내부 녹색 구멍(예: 팔과 몸통 사이)도 #00FF00 배경으로 처리
        for (int i = 0; i < sw * sh; i++)
        {
            if (bg[i]) continue;
            int pi = i * 4;
            byte pr = spx[pi + 2], pg = spx[pi + 1], pb = spx[pi];
            if (pg > 195 && pr < 90 && pb < 90 && (pg - Math.Max(pr, pb)) > 110)
            {
                bg[i] = true;
            }
        }

        // 2) 원본 전경 y 범위 및 하단 부츠 중심 x 측정
        int rawTopY = sh, rawFootY = -1;
        for (int y = 0; y < sh; y++)
            for (int x = 0; x < sw; x++)
                if (!bg[y * sw + x])
                {
                    if (y < rawTopY) rawTopY = y;
                    if (y > rawFootY) rawFootY = y;
                }

        double bootSumX = 0;
        int bootCnt = 0;
        for (int y = Math.Max(rawTopY, rawFootY - 45); y <= rawFootY; y++)
            for (int x = 0; x < sw; x++)
                if (!bg[y * sw + x]) { bootSumX += x; bootCnt++; }
        double rawCenterX = bootSumX / Math.Max(1, bootCnt);

        // 3) 단일 균일 배율 계산 (topY=180, footY=880 목표 -> 높이 700 구간 span = rawFootY - rawTopY)
        double rawSpan = rawFootY - rawTopY;
        double scale = 700.0 / rawSpan;
        double inv = 1.0 / scale;

        // 4) 1024x1024 전경 가중 리샘플링 (배경은 0,255,0)
        int dw = 1024, dh = 1024;
        byte[] dpx = new byte[dw * dh * 4];
        for (int i = 0; i < dw * dh; i++)
        {
            dpx[i * 4] = 0; dpx[i * 4 + 1] = 255; dpx[i * 4 + 2] = 0; dpx[i * 4 + 3] = 255;
        }

        double rad = Math.Max(1.0, inv * 0.75);
        for (int y = 0; y < dh; y++)
        {
            double sy = rawTopY + (y - 180.0) * inv;
            if (sy < -1 || sy > sh) continue;
            int y0 = Math.Max(0, (int)Math.Floor(sy - rad));
            int y1 = Math.Min(sh - 1, (int)Math.Ceiling(sy + rad));

            for (int x = 0; x < dw; x++)
            {
                double sx = rawCenterX + (x - 512.0) * inv;
                if (sx < -1 || sx > sw) continue;
                int x0 = Math.Max(0, (int)Math.Floor(sx - rad));
                int x1 = Math.Min(sw - 1, (int)Math.Ceiling(sx + rad));

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
                        int p = iy * sw + ix;
                        if (!bg[p])
                        {
                            int si = p * 4;
                            wFg += wt;
                            bS += spx[si] * wt;
                            gS += spx[si + 1] * wt;
                            rS += spx[si + 2] * wt;
                        }
                    }
                }
                if (wAll > 0 && (wFg / wAll) >= 0.48)
                {
                    int rr = Math.Min(255, Math.Max(0, (int)Math.Round(rS / wFg)));
                    int gg = Math.Min(255, Math.Max(0, (int)Math.Round(gS / wFg)));
                    int bb = Math.Min(255, Math.Max(0, (int)Math.Round(bS / wFg)));
                    int mrb = Math.Max(rr, bb);
                    if (gg - mrb > 8) gg = mrb + 4; // 디프린지
                    int di = (y * dw + x) * 4;
                    dpx[di] = (byte)bb; dpx[di + 1] = (byte)gg; dpx[di + 2] = (byte)rr; dpx[di + 3] = 255;
                }
            }
        }

        // 5) 2차 외곽 디프린지 및 가장 큰 1개 연결 성분(부스러기 제거) 유지
        for (int y = 1; y < dh - 1; y++)
        {
            for (int x = 1; x < dw - 1; x++)
            {
                int idx = (y * dw + x) * 4;
                if (IsGreen(dpx, idx)) continue;
                byte rr = dpx[idx + 2], gg = dpx[idx + 1], bb = dpx[idx];
                int mrb = Math.Max(rr, bb);
                if (gg > 110 && (gg - mrb) > 10)
                {
                    bool adjBg = IsGreen(dpx, idx - 4) || IsGreen(dpx, idx + 4) || IsGreen(dpx, idx - dw * 4) || IsGreen(dpx, idx + dw * 4);
                    if (adjBg && (gg - mrb) > 18)
                    {
                        dpx[idx] = 0; dpx[idx + 1] = 255; dpx[idx + 2] = 0;
                    }
                    else
                    {
                        dpx[idx + 1] = (byte)Math.Min(gg, mrb + 4);
                    }
                }
            }
        }

        // 8-방향 연결 성분 분석: 가장 큰 1덩어리만 남김
        bool[] vis = new bool[dw * dh];
        List<List<int>> comps = new List<List<int>>();
        int[] dx8 = { -1, 0, 1, -1, 1, -1, 0, 1 };
        int[] dy8 = { -1, -1, -1, 0, 0, 1, 1, 1 };
        for (int i = 0; i < dw * dh; i++)
        {
            if (vis[i] || IsGreen(dpx, i * 4)) continue;
            List<int> comp = new List<int>();
            Queue<int> cq = new Queue<int>();
            vis[i] = true; cq.Enqueue(i);
            while (cq.Count > 0)
            {
                int c = cq.Dequeue();
                comp.Add(c);
                int cx = c % dw, cy = c / dw;
                for (int k = 0; k < 8; k++)
                {
                    int nx = cx + dx8[k], ny = cy + dy8[k];
                    if (nx < 0 || nx >= dw || ny < 0 || ny >= dh) continue;
                    int np = ny * dw + nx;
                    if (!vis[np] && !IsGreen(dpx, np * 4)) { vis[np] = true; cq.Enqueue(np); }
                }
            }
            comps.Add(comp);
        }
        if (comps.Count > 1)
        {
            comps.Sort((a, b) => b.Count.CompareTo(a.Count));
            for (int c = 1; c < comps.Count; c++)
                foreach (int p in comps[c]) { dpx[p * 4] = 0; dpx[p * 4 + 1] = 255; dpx[p * 4 + 2] = 0; }
        }

        // 6) 실측치 및 24-bit RGB 저장
        int outTopY = dh, outFootY = -1, outMinX = dw, outMaxX = -1, greenSpill = 0;
        for (int y = 0; y < dh; y++)
            for (int x = 0; x < dw; x++)
            {
                int idx = (y * dw + x) * 4;
                if (!IsGreen(dpx, idx))
                {
                    if (x < outMinX) outMinX = x; if (x > outMaxX) outMaxX = x;
                    if (y < outTopY) outTopY = y; if (y > outFootY) outFootY = y;
                    if (dpx[idx + 1] > 150 && dpx[idx + 2] < 120 && dpx[idx] < 120) greenSpill++;
                }
            }

        Bitmap outBmp = new Bitmap(dw, dh, PixelFormat.Format24bppRgb);
        BitmapData obd = outBmp.LockBits(new Rectangle(0, 0, dw, dh), ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb);
        byte[] rgb = new byte[obd.Stride * dh];
        for (int y = 0; y < dh; y++)
            for (int x = 0; x < dw; x++)
            {
                int si = (y * dw + x) * 4;
                int di = y * obd.Stride + x * 3;
                rgb[di] = dpx[si]; rgb[di + 1] = dpx[si + 1]; rgb[di + 2] = dpx[si + 2];
            }
        Marshal.Copy(rgb, 0, obd.Scan0, rgb.Length);
        outBmp.UnlockBits(obd);
        outBmp.Save(outPath, ImageFormat.Png);

        // 가이드 겹침 저장 (y=180, y=450..470, y=460, y=880, x=512)
        using (Graphics gg = Graphics.FromImage(outBmp))
        using (Pen pBlue = new Pen(Color.Blue, 2))
        using (Pen pRed = new Pen(Color.Red, 2))
        using (SolidBrush band = new SolidBrush(Color.FromArgb(65, 255, 0, 0)))
        using (Pen pCenter = new Pen(Color.FromArgb(160, 255, 0, 180), 1))
        {
            gg.DrawLine(pBlue, 0, 180, dw, 180);
            gg.FillRectangle(band, 0, 450, dw, 20);
            gg.DrawLine(pRed, 0, 460, dw, 460);
            gg.DrawLine(pBlue, 0, 880, dw, 880);
            gg.DrawLine(pCenter, 512, 0, 512, dh);
        }
        outBmp.Save(guidePath, ImageFormat.Png);
        outBmp.Dispose();
        src.Dispose();

        Console.WriteLine(string.Format("RAW: topY={0}, footY={1}, span={2}, bootCenterX={3:F1}, uniformScale={4:F6}",
            rawTopY, rawFootY, rawFootY - rawTopY + 1, rawCenterX, scale));
        Console.WriteLine(string.Format("ALIGNED: topY={0}, footY={1}, totalH={2}, x=[{3}..{4}] (W={5}), components={6}->{7}, greenSpill={8}",
            outTopY, outFootY, outFootY - outTopY + 1, outMinX, outMaxX, outMaxX - outMinX + 1, comps.Count, 1, greenSpill));
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$root = (Get-Location).Path
$c00Out = Join-Path $root 'test/incoming/char_cecilia/c00_complete.png'
$backup = Join-Path $root 'test/incoming/char_cecilia/c00_complete_v2_33head_old.png'
if ((Test-Path $c00Out) -and -not (Test-Path $backup)) {
    Copy-Item $c00Out $backup -Force
    Write-Output "Backed up old c00_complete.png -> c00_complete_v2_33head_old.png"
}

$src = Join-Path $root 'test/incoming/char_cecilia/nai_25head/c00_25h_v2_3979162304.png'
$guide = Join-Path $root 'scratch/cecilia_c00_25h_with_guide.png'
[CeciliaC00Aligner]::Build($src, $c00Out, $guide)
