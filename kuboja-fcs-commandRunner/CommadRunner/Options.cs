using CommandLine;
using CommandLine.Text;
using System.Collections.Generic;
using System.IO;

namespace Kuboja.Fcs.CommadRunner
{
    internal class Options
    {
        private List<string> errors;

        [Option('b', null, HelpText = "Break execution before end.")]
        public bool Break { get; set; }

        [ValueOption(3)]
        [Option('c', "command", //Required = true,
            DefaultValue = TypeOutputFunction.Print,
            HelpText = "Output command.")]
        public TypeOutputFunction FcsOutputCommnand { get; set; }

        [ValueOption(2)]
        [Option('l', "line", //Required = true,
            DefaultValue = 199,
            HelpText = "Line number in fcs file.")]
        public int FcsFileLineNumber { get; set; }

        [ValueOption(1)]
        [Option('s', "fcs", //Required = true,
            DefaultValue = @"C:\FemCAD\fcs-gsi\Gsi_Silo_ExpertSystem\Design\BaseBoot.fcs",
            HelpText = "Full path to fcs file.")]
        public string FcsFilePath { get; set; }

        [ValueOption(0)]
        [Option('f', "femcad", //Required = true,
            DefaultValue = @"C:\Users\kuboj\ownCloud\FemCAD\FemCAD_app\app current",
            HelpText = "Path to FemCad instalation folder.")]
        public string FemcadFolderPath { get; set; }

        public string FliPath => Path.Combine(FemcadFolderPath, "fli.exe");

        [Option('v', null, HelpText = "Print details during execution.")]
        public bool Verbose { get; set; }

        [HelpOption]
        public string GetUsage()
        {
            return HelpText.AutoBuild(this,
              (HelpText current) => HelpText.DefaultParsingErrorsHandler(this, current));
        }

        public List<string> CheckValues()
        {
            if (errors != null)
            {
                return errors;
            }

            errors = new List<string>();

            if (!File.Exists(FliPath))
            {
                errors.Add("Soubor Fli.exe nenalezen! " + FliPath);
            }

            if (!File.Exists(FcsFilePath))
            {
                errors.Add("Fcs soubor nenalezen! " + FcsFilePath);
            }

            return errors;
        }
    }
}