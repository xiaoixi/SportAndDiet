# Render original vector-style tab icons as transparent, antialiased PNGs.
Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '..\miniprogram\assets\tabbar'
[System.IO.Directory]::CreateDirectory($iconDirectory) | Out-Null

function Draw-TabIcon([string]$name, [bool]$selected) {
    $bitmap = New-Object System.Drawing.Bitmap 324, 324
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.ScaleTransform(13.5, 13.5)
    $color = if ($selected) { '#b85a28' } else { '#8b8b93' }
    $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($color)), 1.7
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $fill = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#ffcd83'))
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    try {
        switch ($name) {
            'today' {
                if ($selected) { $graphics.FillEllipse($fill, 7, 7, 10, 10) }
                $graphics.DrawEllipse($pen, 7, 7, 10, 10)
                foreach ($ray in @(@(12,2.5,12,4), @(12,20,12,21.5), @(2.5,12,4,12), @(20,12,21.5,12), @(5.2,5.2,6.3,6.3), @(17.7,17.7,18.8,18.8), @(5.2,18.8,6.3,17.7), @(17.7,6.3,18.8,5.2))) {
                    $graphics.DrawLine($pen, [single]$ray[0], [single]$ray[1], [single]$ray[2], [single]$ray[3])
                }
            }
            'plan' {
                $path.AddArc(3.5,5,4,4,180,90)
                $path.AddArc(16.5,5,4,4,270,90)
                $path.AddArc(16.5,17,4,4,0,90)
                $path.AddArc(3.5,17,4,4,90,90)
                $path.CloseFigure()
                if ($selected) { $graphics.FillRectangle($fill, 4.5,6,15,3.5) }
                $graphics.DrawPath($pen, $path)
                $graphics.DrawLine($pen,3.5,10,20.5,10)
                $graphics.DrawLine($pen,8,3,8,7)
                $graphics.DrawLine($pen,16,3,16,7)
                $graphics.DrawLine($pen,8,15.5,10.5,18)
                $graphics.DrawLine($pen,10.5,18,16,13)
            }
            'records' {
                $graphics.DrawLine($pen,3.5,3.5,3.5,20.5)
                $graphics.DrawLine($pen,3.5,20.5,21,20.5)
                if ($selected) {
                    $graphics.FillRectangle($fill,7,13,2,7)
                    $graphics.FillRectangle($fill,12,9,2,11)
                    $graphics.FillRectangle($fill,17,4,2,16)
                }
                $graphics.DrawLine($pen,8,17,8,13)
                $graphics.DrawLine($pen,13,17,13,9)
                $graphics.DrawLine($pen,18,17,18,4)
            }
            'me' {
                if ($selected) { $graphics.FillEllipse($fill,8,3,8,8) }
                $graphics.DrawEllipse($pen,8,3,8,8)
                $path.AddBezier(4.5,20.5,4.5,11.5,19.5,11.5,19.5,20.5)
                $path.CloseFigure()
                $graphics.DrawPath($pen,$path)
            }
        }
        $output = New-Object System.Drawing.Bitmap 81, 81
        $renderer = [System.Drawing.Graphics]::FromImage($output)
        try {
            $renderer.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $renderer.DrawImage($bitmap,0,0,81,81)
            $suffix = if ($selected) { '-active' } else { '' }
            $output.Save((Join-Path $iconDirectory "$name$suffix.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        } finally { $renderer.Dispose(); $output.Dispose() }
    } finally { $path.Dispose(); $fill.Dispose(); $pen.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
}

foreach ($name in @('today', 'plan', 'records', 'me')) {
    Draw-TabIcon $name $false
    Draw-TabIcon $name $true
}
