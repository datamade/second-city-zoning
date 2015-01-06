#!/usr/bin/env ruby

zones = ["B1-1","B1-1.5","B1-2","B1-3","B1-5","B2","B2-1","B2-1.5","B2-2","B2-3","B2-5","B3-1","B3-1.5","B3-2","B3-3","B3-5","C1-1","C1-1.5","C1-2","C1-3","C1-5","C2-1","C2-2","C2-3","C2-5","C3-1","C3-2","C3-3","C3-5","C3-7","DC-12","DC-16","DR-10","DR-3","DR-5","DR-7","DS-3","DS-5","DX-12","DX-16","DX-3","DX-5","DX-7","M1-1","M1-2","M1-3","M2-1","M2-2","M2-3","M3-1","M3-2","M3-3","PD","PMD","POS-1","POS-2","POS-3","RM-4.5","RM-5","RM-5.5","RM-6","RM-6.5","RS-1","RS-2","RS-3","RT-3.5","RT-4","RT-4A","T"]

zones.each do |zone|
  puts zone
  begin
    system("curl --data 'zone=#{zone}' http://files2.chicagotribune.com/metro/zone/zdesc.php")
  rescue
    puts "failed"
  end
end